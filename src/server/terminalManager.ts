import type { ServerWebSocket } from "bun";

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
    /** Drops this session from the manager's registry so a later viewer re-checks the pane. */
    private readonly onDead: () => void,
  ) {}

  /** Seed this viewer with the current pane, then ensure the live stream is running. */
  async attach(ws: TerminalSocket): Promise<void> {
    const seed = await this.system.capturePaneAnsi(this.sessionName);
    if (seed) send(ws, dataMessage(seed));
    if (this.dead || seed.includes(DEAD_PANE_MARKER)) {
      this.dead = true;
      send(ws, { type: "exit" });
      this.onDead();
      return;
    }
    if (!this.stream && !this.streamStarting) await this.startStream();
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
    // Reflow the pane to this viewer's geometry before seeding: a full-screen TUI positions
    // by absolute coordinates, so a capture taken at a different width renders garbled in xterm.
    await this.system.resizePane(sessionName, cols, rows);
    // Cache the resolved name so message/close handlers act on the session opened here, even if the
    // ticket's slot is reassigned mid-connection (see TerminalSocketData.resolvedSessionName).
    ws.data.resolvedSessionName = sessionName;
    const session = this.sessions.get(sessionName) ?? this.createSession(sessionName);
    session.viewers.add(ws);
    await session.attach(ws);
  }

  private createSession(sessionName: string): TerminalSession {
    const session = new TerminalSession(sessionName, this.system, () => {
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
