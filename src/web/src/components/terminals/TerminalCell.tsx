import { Columns2, Rows2, X } from "lucide-react";
import { useCallback, useRef } from "react";

import { TERMINAL_BG, terminalWsUrl, useXtermSocket } from "@/hooks/useXtermSocket";
import { cn } from "@/lib/utils";

interface TerminalCellProps {
  /** Opaque server terminal id; resolved to a tmux session by the WS stream. */
  terminalId: string;
  /** Short title shown in the cell header (e.g. "repo · #2"). */
  title: string;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onSplitVertical: () => void;
  onSplitHorizontal: () => void;
}

/**
 * One terminal split cell: an xterm.js view bound to a user terminal over `/ws/terminal?terminalId=`.
 * Unlike the agent LiveTerminal (read-only by default), a user terminal is interactive — keystrokes
 * are always forwarded. It settles on "session terminée" as soon as the shell exits or the stream
 * drops (no reconnect retry; see liveRef below).
 */
export function TerminalCell({
  terminalId,
  title,
  focused,
  onFocus,
  onClose,
  onSplitVertical,
  onSplitHorizontal,
}: TerminalCellProps) {
  // A user terminal is always interactive. It is NOT "live" in the agent sense: the tmux session is
  // created (POST) before the socket opens, so there is no queued → setup window to retry through —
  // and a backend restart drops the in-memory descriptor, making the session unrecoverable. So an
  // exited shell (or dropped stream) settles immediately on "session terminée" instead of hammering
  // reconnects. Keystrokes are always forwarded.
  const inputEnabledRef = useRef(true);
  const liveRef = useRef(false);

  const buildWsUrl = useCallback(
    (cols: number, rows: number) => terminalWsUrl({ terminalId }, cols, rows),
    [terminalId],
  );

  const { containerRef, exited } = useXtermSocket({
    target: terminalId,
    buildWsUrl,
    inputEnabledRef,
    liveRef,
  });

  return (
    <section
      onFocusCapture={onFocus}
      onMouseDown={onFocus}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-card",
        focused && "ring-1 ring-primary",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1">
        <span className="flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
          <span className="truncate">{title}</span>
          <span
            className={cn(
              "rounded px-1 py-0.5 text-[9px] font-medium uppercase",
              exited ? "bg-muted text-muted-foreground" : "bg-info/20 text-info",
            )}
          >
            {exited ? "terminée" : "saisie"}
          </span>
        </span>
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <button
            type="button"
            onClick={onSplitVertical}
            aria-label="Split vertical (côte à côte)"
            title="Split vertical (⌘D)"
            className="rounded p-1 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Columns2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onSplitHorizontal}
            aria-label="Split horizontal (empilé)"
            title="Split horizontal (⌘⇧D)"
            className="rounded p-1 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Rows2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le terminal"
            title="Fermer (⌘W)"
            className="rounded p-1 transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        role="group"
        aria-label={`Terminal ${title}`}
        style={{ backgroundColor: TERMINAL_BG }}
        className="min-h-0 flex-1 overflow-hidden p-1"
      />
    </section>
  );
}
