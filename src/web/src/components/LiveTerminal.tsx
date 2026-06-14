import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type IDisposable } from "@xterm/xterm";
import { Keyboard, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import "@xterm/xterm/css/xterm.css";

import { terminalServerMessageSchema } from "@shared/schemas";

import { cn } from "@/lib/utils";

interface LiveTerminalProps {
  ticketId: string;
  /** Stretch to fill the parent's height instead of capping at 60vh. */
  fill?: boolean;
  /**
   * Whether the agent session is expected to be running. The pane WebSocket can connect before
   * tmux is spawned (queued → setup window): the server then reports the pane gone. While the
   * session should be live, the view retries instead of freezing on "session terminée".
   */
  live?: boolean;
}

const TITLE = "Terminal";
const TERMINAL_FONT_SIZE = 12;
const TERMINAL_SCROLLBACK = 5000;
/** Retry cadence while reconnecting to a pane that has not produced a live stream yet. */
const RECONNECT_DELAY_MS = 1000;
/** Bounded retries so a genuinely dead-but-active pane eventually settles on "session terminée". */
const MAX_CONNECT_ATTEMPTS = 300;
/** Shared background so the xterm theme and the wrapper never desync. */
const TERMINAL_BG = "#001219";

const TERMINAL_THEME = {
  background: TERMINAL_BG,
  foreground: "#94d2bd",
  cursor: "#94d2bd",
  cursorAccent: TERMINAL_BG,
} as const;

const textEncoder = new TextEncoder();

function wsUrl(ticketId: string, cols: number, rows: number): string {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const params = new URLSearchParams({ ticketId, cols: String(cols), rows: String(rows) });
  return `${protocol}://${location.host}/ws/terminal?${params.toString()}`;
}

/** UTF-8 string of keystrokes → hex byte string for `tmux send-keys -H`. */
function toHex(data: string): string {
  let hex = "";
  for (const byte of textEncoder.encode(data)) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function badgeLabelFor(exited: boolean, inputActive: boolean): string {
  if (exited) return "session terminée";
  if (inputActive) return "saisie active";
  return "lecture seule";
}

/** base64 pane chunk → bytes for xterm.write (handles partial UTF-8 across writes). */
function fromBase64(chunk: string): Uint8Array {
  const binary = atob(chunk);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Interactive live view of an agent's tmux pane over `/ws/terminal`: streams ANSI output
 * into xterm.js and relays keystrokes/resize back. Input is off by default (co-control,
 * so toggling it sends no signal to the agent); the pane keeps running either way.
 */
export function LiveTerminal({ ticketId, fill = false, live = true }: LiveTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const inputEnabledRef = useRef(false);
  const liveRef = useRef(live);

  const [inputEnabled, setInputEnabled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [exited, setExited] = useState(false);

  // Read the latest liveness inside the socket callbacks without remounting the terminal on change.
  liveRef.current = live;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      convertEol: false,
      fontSize: TERMINAL_FONT_SIZE,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      theme: { ...TERMINAL_THEME },
      scrollback: TERMINAL_SCROLLBACK,
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    termRef.current = term;
    fitRef.current = fit;
    setExited(false);

    let socket: WebSocket | null = null;
    let dataSub: IDisposable | null = null;
    let resizeSub: IDisposable | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let disposed = false;

    // Connect only once the pane has a real box. A full-screen TUI is captured by absolute
    // coordinates, so fitting/seeding while the container is still unsized (detail panel not
    // laid out yet) makes xterm render the seed and the live stream at the wrong geometry —
    // garbled and seemingly frozen until a manual resize/remount. Deferring to the first real
    // size makes the very first frame correct.
    function connect(): void {
      if (disposed) return;
      try {
        fit.fit();
      } catch {
        // Not measurable this frame; keep the last good geometry.
      }
      // term.cols/rows now hold the real viewport; carry it so the server reflows the pane to
      // this geometry before its first capture (no resize message fires when fit is a no-op).
      const ws = new WebSocket(wsUrl(ticketId, term.cols, term.rows));
      socket = ws;
      let settled = false;

      // A dropped socket — or an `exit` received while the pane is still spawning (the queued →
      // setup window before tmux exists) — must not freeze the view. Retry while the session is
      // expected to be live; settle on the last frame once it is genuinely gone or the retry budget
      // is spent. Funnel close + exit through one idempotent path so a close after an exit can't
      // double-fire.
      const onGone = (): void => {
        if (settled) return;
        settled = true;
        dataSub?.dispose();
        resizeSub?.dispose();
        dataSub = null;
        resizeSub = null;
        try {
          ws.close();
        } catch {
          // Already closing.
        }
        if (disposed) return;
        if (!liveRef.current || attempts >= MAX_CONNECT_ATTEMPTS) {
          setExited(true);
          return;
        }
        attempts += 1;
        retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        const parsed = terminalServerMessageSchema.safeParse(payload);
        if (!parsed.success) return;
        if (parsed.data.type === "data") {
          // A live frame resets the budget so it bounds *consecutive* failures, not the lifetime:
          // a long session that briefly flaps must not eventually freeze while still running.
          attempts = 0;
          term.write(fromBase64(parsed.data.chunk));
        } else onGone();
      });
      ws.addEventListener("close", onGone);

      dataSub = term.onData((data) => {
        if (!inputEnabledRef.current || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: "input", hex: toHex(data) }));
      });
      resizeSub = term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "resize", cols, rows }));
      });
    }

    const observer = new ResizeObserver(() => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      if (!socket) {
        connect();
        return;
      }
      try {
        fit.fit();
      } catch {
        // Not measurable this frame; the next observation refits.
      }
    });
    observer.observe(container);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      observer.disconnect();
      dataSub?.dispose();
      resizeSub?.dispose();
      socket?.close();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [ticketId]);

  // Refit after the layout settles when toggling fullscreen.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        fitRef.current?.fit();
      } catch {
        // Not measurable yet; ResizeObserver will catch up.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [fullscreen]);

  // Keep the onData handler's flag current and focus the pane when input is enabled.
  useEffect(() => {
    inputEnabledRef.current = inputEnabled && !exited;
    if (inputEnabled && !exited) termRef.current?.focus();
  }, [inputEnabled, exited]);

  // Escape exits fullscreen without bubbling to the drawer's own Escape handler.
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [fullscreen]);

  const inputActive = inputEnabled && !exited;
  const badgeLabel = badgeLabelFor(exited, inputActive);

  return (
    <section
      className={cn(
        fill && "flex h-full min-h-0 flex-col",
        fullscreen && "fixed inset-0 z-[60] flex flex-col bg-background p-4",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{TITLE}</h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
              inputActive ? "bg-info/20 text-info" : "bg-muted text-muted-foreground",
            )}
          >
            {badgeLabel}
          </span>
          <button
            type="button"
            onClick={() => setInputEnabled((v) => !v)}
            disabled={exited}
            className={cn(
              "transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
              inputActive ? "text-info" : "text-muted-foreground",
            )}
            aria-label={inputActive ? "Désactiver la saisie" : "Activer la saisie"}
            aria-pressed={inputActive}
            title={inputActive ? "Saisie active (cliquer pour repasser en lecture seule)" : "Activer la saisie"}
          >
            <Keyboard className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={fullscreen ? "Réduire le terminal" : "Agrandir le terminal"}
            title={fullscreen ? "Réduire" : "Plein écran"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        role="group"
        aria-label={`${TITLE} interactif`}
        style={{ backgroundColor: TERMINAL_BG }}
        className={cn(
          "overflow-hidden rounded-md p-2",
          fullscreen || fill ? "min-h-0 flex-1" : "h-[60vh] min-h-[12rem]",
        )}
      />
    </section>
  );
}
