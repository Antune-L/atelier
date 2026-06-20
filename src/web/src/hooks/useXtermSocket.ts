import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type IDisposable } from "@xterm/xterm";
import { useEffect, useRef, useState, type RefObject } from "react";

import "@xterm/xterm/css/xterm.css";

import { terminalServerMessageSchema } from "@shared/schemas";

const TERMINAL_FONT_SIZE = 12;
const TERMINAL_SCROLLBACK = 5000;
/** Retry cadence while reconnecting to a pane that has not produced a live stream yet. */
const RECONNECT_DELAY_MS = 1000;
/** Bounded retries so a genuinely dead-but-active pane eventually settles on "session terminée". */
const MAX_CONNECT_ATTEMPTS = 300;
/**
 * Delay before the very first connect (initial fit + websocket open). The detail drawer is a
 * right-side sheet that opens via a CSS transform (translate), so the terminal box already has its
 * final dimensions at mount: the ResizeObserver fires immediately, mid-transform. Fitting/rendering
 * then bakes the first xterm canvas into the transformed (blurry) geometry, and since the box size
 * never changes again the observer never refits. Must exceed the modal's open transition
 * (see modal.tsx TRANSITION_MS = 200) so the first render happens at the settled, untransformed box.
 */
const INITIAL_CONNECT_DELAY_MS = 250;
/** Coalesce rapid panel layout changes (split/resize) before refitting an open terminal. */
const RESIZE_DEBOUNCE_MS = 50;
/** Shared background so the xterm theme and the wrapper never desync. */
export const TERMINAL_BG = "#001219";

const TERMINAL_THEME = {
  background: TERMINAL_BG,
  foreground: "#94d2bd",
  cursor: "#94d2bd",
  cursorAccent: TERMINAL_BG,
} as const;

const textEncoder = new TextEncoder();

/** UTF-8 string of keystrokes → hex byte string for `tmux send-keys -H`. */
function toHex(data: string): string {
  let hex = "";
  for (const byte of textEncoder.encode(data)) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

/** base64 pane chunk → bytes for xterm.write (handles partial UTF-8 across writes). */
function fromBase64(chunk: string): Uint8Array {
  const binary = atob(chunk);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Build the `/ws/terminal` URL for the resolved viewer geometry. */
export function terminalWsUrl(params: Record<string, string>, cols: number, rows: number): string {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const query = new URLSearchParams({ ...params, cols: String(cols), rows: String(rows) });
  return `${protocol}://${location.host}/ws/terminal?${query.toString()}`;
}

export interface UseXtermSocketOptions {
  /** Re-mounts the xterm/socket when this changes (the pane address: ticketId or terminalId). */
  target: string;
  /** Build the WS URL for the current viewport; called on every (re)connect. */
  buildWsUrl: (cols: number, rows: number) => string;
  /**
   * Whether keystrokes are forwarded. Read live inside the onData handler so toggling it never
   * remounts the terminal. TerminalCell passes a ref that is always true (interactive); LiveTerminal
   * passes its read-only-toggle ref (off by default).
   */
  inputEnabledRef: RefObject<boolean>;
  /**
   * Whether the session is expected to be running. A live frame resets the retry budget either way;
   * when not live, a dropped/exited stream settles immediately on "session terminée" instead of
   * retrying (LiveTerminal's queued → setup window). TerminalCell is always live (true).
   */
  liveRef: RefObject<boolean>;
}

export interface UseXtermSocket {
  containerRef: RefObject<HTMLDivElement>;
  termRef: RefObject<Terminal | null>;
  fitRef: RefObject<FitAddon | null>;
  exited: boolean;
}

/**
 * Owns the xterm.js lifecycle for a `/ws/terminal` pane: opens the terminal, connects (deferring to
 * the first real container size so the very first frame has correct geometry), reconnects on a
 * dropped/seeding stream within a bounded budget, relays input/resize, and settles `exited` once the
 * pane is genuinely gone. Shared by LiveTerminal (read-only agent pane) and TerminalCell (interactive
 * user terminal); the two differences are parameterized via `buildWsUrl` and `inputEnabledRef`.
 */
export function useXtermSocket({
  target,
  buildWsUrl,
  inputEnabledRef,
  liveRef,
}: UseXtermSocketOptions): UseXtermSocket {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [exited, setExited] = useState(false);

  // Keep the latest callbacks/flags without remounting the terminal on identity change.
  const buildWsUrlRef = useRef(buildWsUrl);
  buildWsUrlRef.current = buildWsUrl;

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
    let initialConnectTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let disposed = false;

    // Fit to the container and repaint the scrollback. xterm does not always redraw existing buffer
    // rows after a geometry change — Ctrl+L "fixes" the view because it forces a full redraw.
    function refit(): void {
      try {
        fit.fit();
        term.refresh(0, term.rows - 1);
      } catch {
        // Not measurable this frame; keep the last good geometry.
      }
    }

    // Connect only once the pane has a real box AND the layout has settled. A full-screen TUI is
    // captured by absolute coordinates, so fitting/seeding while the container is still unsized
    // (detail panel not laid out yet, or a split panel mid-reflow) makes xterm render the seed and
    // the live stream at the wrong geometry — blank or garbled until a manual resize/clear. The
    // drawer also opens via a CSS transform; the initial connect is debounced (see
    // INITIAL_CONNECT_DELAY_MS) so the first frame uses the settled, untransformed geometry.
    function connect(): void {
      if (disposed) return;
      refit();
      // term.cols/rows now hold the real viewport; carry it so the server reflows the pane to
      // this geometry before its first capture (no resize message fires when fit is a no-op).
      const ws = new WebSocket(buildWsUrlRef.current(term.cols, term.rows));
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
        // Debounce the first connect: a split remounts the cell while react-resizable-panels
        // reflows, so the first observation is often stale. Wait for dimensions to stabilize.
        if (initialConnectTimer) clearTimeout(initialConnectTimer);
        initialConnectTimer = setTimeout(() => {
          initialConnectTimer = null;
          connect();
        }, INITIAL_CONNECT_DELAY_MS);
        return;
      }
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        resizeDebounceTimer = null;
        refit();
      }, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(container);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (initialConnectTimer) clearTimeout(initialConnectTimer);
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      observer.disconnect();
      dataSub?.dispose();
      resizeSub?.dispose();
      socket?.close();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [target, inputEnabledRef, liveRef]);

  return { containerRef, termRef, fitRef, exited };
}
