import { Keyboard } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { FullscreenToggle, TERMINAL_TITLE } from "@/components/FullscreenToggle";
import { useFullscreenEscape } from "@/hooks/useFullscreenEscape";
import { TERMINAL_BG, terminalWsUrl, useXtermSocket } from "@/hooks/useXtermSocket";
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

function badgeLabelFor(exited: boolean, inputActive: boolean): string {
  if (exited) return "session terminée";
  if (inputActive) return "saisie active";
  return "lecture seule";
}

/**
 * Interactive live view of an agent's tmux pane over `/ws/terminal`: streams ANSI output
 * into xterm.js and relays keystrokes/resize back. Input is off by default (co-control,
 * so toggling it sends no signal to the agent); the pane keeps running either way.
 */
export function LiveTerminal({ ticketId, fill = false, live = true }: LiveTerminalProps) {
  const inputEnabledRef = useRef(false);
  const liveRef = useRef(live);

  const [inputEnabled, setInputEnabled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Read the latest liveness inside the socket callbacks without remounting the terminal on change.
  liveRef.current = live;

  const buildWsUrl = useCallback(
    (cols: number, rows: number) => terminalWsUrl({ ticketId }, cols, rows),
    [ticketId],
  );

  const { containerRef, termRef, fitRef, exited } = useXtermSocket({
    target: ticketId,
    buildWsUrl,
    inputEnabledRef,
    liveRef,
  });

  // Refit after the layout settles when toggling fullscreen.
  useEffect(() => {
    const timer = setTimeout(() => {
      const term = termRef.current;
      const fit = fitRef.current;
      if (!term || !fit) return;
      try {
        fit.fit();
        term.refresh(0, term.rows - 1);
      } catch {
        // Not measurable yet; ResizeObserver will catch up.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [fullscreen, fitRef, termRef]);

  // Keep the onData handler's flag current and focus the pane when input is enabled.
  useEffect(() => {
    inputEnabledRef.current = inputEnabled && !exited;
    if (inputEnabled && !exited) termRef.current?.focus();
  }, [inputEnabled, exited, termRef]);

  useFullscreenEscape(fullscreen, () => setFullscreen(false));

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
        <h3 className="text-sm font-semibold">{TERMINAL_TITLE}</h3>
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
          <FullscreenToggle fullscreen={fullscreen} onToggle={() => setFullscreen((v) => !v)} />
        </div>
      </div>
      <div
        ref={containerRef}
        role="group"
        aria-label={`${TERMINAL_TITLE} interactif`}
        style={{ backgroundColor: TERMINAL_BG }}
        className={cn(
          "overflow-hidden rounded-md p-2",
          fullscreen || fill ? "min-h-0 flex-1" : "h-[60vh] min-h-[12rem]",
        )}
      />
    </section>
  );
}
