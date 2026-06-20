import type { ServerWebSocket } from "bun";

import { TERMINAL_SEED_HISTORY_LINES } from "../shared/constants.ts";
import type { TerminalServerMessage } from "../shared/schemas.ts";
import { terminalClientMessageSchema } from "../shared/schemas.ts";

import type { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import type { TriageManager } from "./agents/triageManager.ts";
import type { Store } from "./db/store.ts";
import { createLogger } from "./logger.ts";
import type { SystemAdapter } from "./system/index.ts";
import type { PaneStream } from "./system/types.ts";
import type { UserTerminalManager } from "./userTerminalManager.ts";

export interface TerminalSocketData {
  kind: "terminal";
  /** Exactly one of these addresses the pane: an agent ticket, or a user terminal. */
  ticketId?: string;
  terminalId?: string;
  /**
   * Session name resolved once at open and cached here. Re-resolving per message/close is unsafe:
   * a ticket's slot can be reassigned mid-connection, so a later resolution may return a different
   * name and miss the registry, leaking the original TerminalSession's FIFO. Set in handleOpen.
   */
  resolvedSessionName?: string;
  /** Viewer's initial xterm geometry; the pane is reflowed to it before the first capture. */
  cols: number;
  rows: number;
}

export type TerminalSocket = ServerWebSocket<TerminalSocketData>;

const log = createLogger("terminal");

/** Marker the dead-pane keep-alive prints once Claude exits (see real.ts spawnSession). */
const DEAD_PANE_MARKER = "[claude exited";

/**
 * Home the cursor, clear the screen, and drop the scrollback. Sent before every seed so a reconnect's
 * frame never stacks on the previous screen, and before a stream-carried reprint so the reprint lands
 * on a known-empty grid instead of on top of stale content.
 */
const CLEAR_SCREEN = "\x1b[H\x1b[2J\x1b[3J";

function send(ws: TerminalSocket, message: TerminalServerMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    // Viewer is mid-teardown; the close handler will evict it.
  }
}

function dataMessage(bytes: Uint8Array | string): TerminalServerMessage {
  const buffer = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : Buffer.from(bytes);
  return { type: "data", chunk: buffer.toString("base64") };
}

/** CSI/escape sequences, stripped only to compare rows by their visible text. */
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|[@-Z\\-_])/g;

/** A captured row's visible text, escape codes (colour, cursor) removed. */
function visibleText(line: string): string {
  return line.replace(ANSI_ESCAPE, "");
}

/**
 * Prepare a `tmux capture-pane` dump for replay into a freshly-mounted xterm. Three corrections, all
 * needed for a reseed (split, tab switch, reload) to reproduce the live view:
 *
 * 1. capture-pane returns the whole pane grid, so a shell whose prompt sits near the top comes back
 *    padded with the pane's blank bottom rows. Written verbatim those trailing newlines scroll the
 *    real content up out of the viewport, leaving a blank screen with the cursor parked at the bottom
 *    (the "I press Ctrl+L to see the old terminals again" bug). Drop leading/trailing blank rows so
 *    the seed sits where the live cursor actually is.
 * 2. The shell re-emits its prompt on a fresh line every time the pane is resized (each connect
 *    resizes it to the viewer's geometry) and once more at startup when async git info loads — none
 *    of these redraws happen in place in a detached pane, so the capture stacks N identical prompts.
 *    Collapse that trailing run of re-renders (lines that are a visible-prefix of the live line) down
 *    to the one the cursor is on. Real output is untouched: it is never a prefix of the prompt.
 * 3. capture-pane separates rows with bare LF, but the viewer runs with convertEol:false, so LF only
 *    moves the cursor down — not back to column 0. Replayed rows then cascade diagonally to the right.
 *    Rejoin with CRLF. The live stream is unaffected: its raw pty bytes already end lines with CRLF.
 */
function normalizeSeed(seed: string): string {
  const lines = seed.split(/\r?\n/);
  let end = lines.length;
  while (end > 0 && visibleText(lines[end - 1] ?? "").trim() === "") end -= 1;
  let begin = 0;
  while (begin < end && visibleText(lines[begin] ?? "").trim() === "") begin += 1;
  if (begin >= end) return "";

  const live = lines[end - 1] ?? "";
  const liveText = visibleText(live);
  let start = end - 1;
  while (start > begin) {
    const prev = visibleText(lines[start - 1] ?? "");
    if (prev.trim() === "" || prev.length > liveText.length || !liveText.startsWith(prev)) break;
    start -= 1;
  }
  return [...lines.slice(begin, start), live].join("\r\n");
}

/**
 * One live terminal per ticket: seeds each viewer with the current screen, fans out the
 * pane's byte stream to N viewers, and relays their input/resize back. The single pane
 * stream is opened on the first viewer and closed when the last one leaves.
 */
class TerminalSession {
  readonly viewers = new Set<TerminalSocket>();
  private stream: PaneStream | null = null;
  private streamStarting = false;
  private dead = false;
  private disposed = false;

  constructor(
    private readonly sessionName: string,
    private readonly system: SystemAdapter,
    /** Scrollback to prepend to the seed; 0 for an agent TUI pane (current frame only). */
    private readonly seedHistoryLines: number,
    /** Drops this session from the manager's registry so a later viewer re-checks the pane. */
    private readonly onDead: () => void,
  ) {}

  /**
   * Bring this viewer up to the live pane. When `willReprint` is set (an agent TUI whose pane is about
   * to be reflowed to a new size), the resize makes Ink reprint its whole frame; seeding a capture
   * taken across that reprint leaves the reprint painted on top of stale text. So instead we attach the
   * live stream first, clear the client, then resize — the reprint flows through the stream onto an
   * empty grid as one clean frame. Otherwise (user shell, unchanged size, dry-run) no reprint happens,
   * so we reflow and replay a plain capture seed.
   */
  async attach(ws: TerminalSocket, willReprint: boolean): Promise<void> {
    if (willReprint) {
      // Probe only to detect a dead pane: a finished agent never reprints, so it must take the seed
      // path below or the cleared client would stay blank.
      const probe = await this.system.capturePaneAnsi(this.sessionName, this.seedHistoryLines);
      if (this.dead || probe.includes(DEAD_PANE_MARKER)) return this.sendDeadFrame(ws, probe);
      if (!this.stream && !this.streamStarting) await this.startStream();
      if (this.dead) return;
      send(ws, dataMessage(CLEAR_SCREEN));
      await this.system.resizePane(this.sessionName, ws.data.cols, ws.data.rows);
      return;
    }
    await this.system.resizePane(this.sessionName, ws.data.cols, ws.data.rows);
    const raw = await this.system.capturePaneAnsi(this.sessionName, this.seedHistoryLines);
    if (this.dead || raw.includes(DEAD_PANE_MARKER)) return this.sendDeadFrame(ws, raw);
    send(ws, dataMessage(CLEAR_SCREEN));
    const seed = normalizeSeed(raw);
    if (seed) send(ws, dataMessage(seed));
    if (!this.stream && !this.streamStarting) await this.startStream();
  }

  /** Replay the pane's final frame to a viewer that arrived after it died, then settle it as exited. */
  private sendDeadFrame(ws: TerminalSocket, raw: string): void {
    send(ws, dataMessage(CLEAR_SCREEN));
    const seed = normalizeSeed(raw);
    if (seed) send(ws, dataMessage(seed));
    this.dead = true;
    send(ws, { type: "exit" });
    this.onDead();
  }

  private async startStream(): Promise<void> {
    this.streamStarting = true;
    try {
      if (!(await this.system.hasSession(this.sessionName))) {
        this.dead = true;
        this.broadcast({ type: "exit" });
        this.onDead();
        return;
      }
      const stream = await this.system.openPaneStream(this.sessionName);
      // The last viewer may have left (teardown) while the stream was opening; if so,
      // close it now so the FIFO/pipe-pane can't outlive the session (orphan leak).
      if (this.disposed || this.viewers.size === 0) {
        await stream.close().catch(() => undefined);
        return;
      }
      this.stream = stream;
      void this.pump(stream);
    } finally {
      this.streamStarting = false;
    }
  }

  private async pump(stream: PaneStream): Promise<void> {
    try {
      for await (const chunk of stream.chunks) this.broadcast(dataMessage(chunk));
    } catch (error) {
      log.warn("flux pane interrompu", { sessionName: this.sessionName, error: String(error) });
    }
    // Stream ended (pane/session gone): clean up the FIFO and tell viewers, but keep them
    // connected so the last screen stays visible (input disabled client-side on exit).
    this.dead = true;
    this.stream = null;
    await stream.close().catch(() => undefined);
    this.broadcast({ type: "exit" });
    this.onDead();
  }

  private broadcast(message: TerminalServerMessage): void {
    const raw = JSON.stringify(message);
    for (const ws of this.viewers) {
      try {
        ws.send(raw);
      } catch {
        // Evicted by its own close handler.
      }
    }
  }

  async teardown(): Promise<void> {
    this.disposed = true;
    if (this.stream) await this.stream.close().catch(() => undefined);
    this.stream = null;
  }
}

/**
 * Routes the `/ws/terminal` channel: resolves each viewer's address (an agent ticket or a user
 * terminal) to its tmux session, groups viewers into per-session TerminalSessions, and forwards
 * input/resize to tmux.
 */
export class TerminalSessionManager {
  private readonly sessions = new Map<string, TerminalSession>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly triage: TriageManager,
    private readonly feasibility: FeasibilityBatchManager,
    private readonly userTerminals: UserTerminalManager,
  ) {}

  async handleOpen(ws: TerminalSocket): Promise<void> {
    const { cols, rows } = ws.data;
    const sessionName = this.resolveSession(ws.data);
    if (!sessionName) {
      send(ws, { type: "exit" });
      return;
    }
    // Cache the resolved name so message/close handlers act on the session opened here, even if the
    // ticket's slot is reassigned mid-connection (see TerminalSocketData.resolvedSessionName).
    ws.data.resolvedSessionName = sessionName;
    // An agent pane is a full-screen TUI whose scrollback stacks duplicate frames on resize, so seed
    // from the visible frame only; a user terminal is a plain shell where past commands are worth
    // replaying on reopen. terminalId addresses a user terminal; ticketId an agent.
    const isUserTerminal = ws.data.terminalId !== undefined;
    const seedHistoryLines = isUserTerminal ? TERMINAL_SEED_HISTORY_LINES : 0;
    // Only an agent pane reprints on reflow, and only when the size actually changes. attach() owns the
    // reflow so that, on the reprint path, the live stream is attached before the resize (see attach()).
    const willReprint = !isUserTerminal && (await this.willResize(sessionName, cols, rows));
    const session = this.sessions.get(sessionName) ?? this.createSession(sessionName, seedHistoryLines);
    session.viewers.add(ws);
    await session.attach(ws, willReprint);
  }

  /** Whether reflowing the pane to (cols, rows) would change its size — i.e. trigger a TUI reprint. */
  private async willResize(sessionName: string, cols: number, rows: number): Promise<boolean> {
    const size = await this.system.paneSize(sessionName);
    return size !== null && (size.cols !== cols || size.rows !== rows);
  }

  private createSession(sessionName: string, seedHistoryLines: number): TerminalSession {
    const session = new TerminalSession(sessionName, this.system, seedHistoryLines, () => {
      // Identity guard: a relaunch may have replaced this entry with a fresh session.
      if (this.sessions.get(sessionName) === session) this.sessions.delete(sessionName);
    });
    this.sessions.set(sessionName, session);
    return session;
  }

  handleMessage(ws: TerminalSocket, raw: string): void {
    const parsed = terminalClientMessageSchema.safeParse(safeParse(raw));
    if (!parsed.success) return;
    const sessionName = ws.data.resolvedSessionName;
    if (!sessionName) return;
    const message = parsed.data;
    if (message.type === "input") {
      void this.system.sendKeysRaw(sessionName, message.hex);
    } else {
      void this.system.resizePane(sessionName, message.cols, message.rows);
    }
  }

  handleClose(ws: TerminalSocket): void {
    const sessionName = ws.data.resolvedSessionName;
    if (!sessionName) return;
    const session = this.sessions.get(sessionName);
    if (!session) return;
    session.viewers.delete(ws);
    if (session.viewers.size === 0) {
      this.sessions.delete(sessionName);
      void session.teardown();
    }
  }

  /** Resolve a viewer's address (ticket or user terminal) to its live tmux session, or null. */
  private resolveSession(data: TerminalSocketData): string | null {
    if (data.terminalId !== undefined) return this.userTerminals.resolveSession(data.terminalId);
    if (data.ticketId === undefined) return null;
    return this.resolveTicketSession(data.ticketId);
  }

  /** ticketId → tmux session name via its active slot, or its triage session; null when none lives. */
  private resolveTicketSession(ticketId: string): string | null {
    const ticket = this.store.getTicket(ticketId);
    // A feasibility batch runs on a synthetic id (no real ticket): fall back to its detached session.
    if (!ticket) return this.feasibility.resolveSession(ticketId);
    // A triage runs in no slot: fall back to its detached session, then to the feasibility
    // batch session evaluating this ticket (batch analysis runs on a synthetic id, not the ticket).
    if (ticket.slotId === null) {
      return this.triage.resolveSession(ticketId)
        ?? this.feasibility.resolveSessionForTicket(ticketId);
    }
    const slot = this.store.getSlot(ticket.slotId);
    return slot?.tmuxSession ?? null;
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
