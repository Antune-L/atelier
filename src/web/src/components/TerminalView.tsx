import { useEffect, useRef, useState } from "react";

import { FullscreenToggle, TERMINAL_TITLE } from "@/components/FullscreenToggle";
import { useFullscreenEscape } from "@/hooks/useFullscreenEscape";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface TerminalViewProps {
  ticketId: string;
  /** Stretch to fill the parent's height instead of capping at 60vh. */
  fill?: boolean;
  /** Chrome-less, non-interactive thumbnail (no header, no fullscreen) for embedding in a card. */
  compact?: boolean;
}

interface TerminalData {
  output: string;
  phase: string | null;
}

const POLL_INTERVAL_MS = 2000;
/** Compact previews are glanceable thumbnails, and several render at once — poll them less often. */
const COMPACT_POLL_INTERVAL_MS = 4000;

/** Distance (px) from the bottom within which the view is still considered "pinned". */
const BOTTOM_THRESHOLD_PX = 24;

const EMPTY_HINT = "La session démarre, en attente de la première sortie de l'agent…";

/** Read-only polled view of an agent tmux pane (with setup phase). */
export function TerminalView({ ticketId, fill = false, compact = false }: TerminalViewProps) {
  const [data, setData] = useState<TerminalData>({ output: "", phase: null });
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  // Stay pinned to the bottom only while the user hasn't scrolled up to read.
  const pinnedToBottom = useRef(true);

  const handleScroll = (): void => {
    const el = preRef.current;
    if (!el) return;
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX;
  };

  // Poll the terminal endpoint while mounted; skip while the tab is hidden so a backgrounded
  // Agents view (many previews) issues no requests, and refetch immediately on return.
  useEffect(() => {
    // A fresh stream starts pinned so its first output scrolls into view.
    pinnedToBottom.current = true;
    let active = true;
    const poll = async (): Promise<void> => {
      if (document.hidden) return;
      try {
        const next = await api.terminal(ticketId);
        if (!active) return;
        setError(null);
        setData(next);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Terminal indisponible");
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), compact ? COMPACT_POLL_INTERVAL_MS : POLL_INTERVAL_MS);
    const onVisible = (): void => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ticketId, compact]);

  // Follow new output only when the user is still pinned to the bottom.
  useEffect(() => {
    const el = preRef.current;
    if (el && pinnedToBottom.current) el.scrollTop = el.scrollHeight;
  }, [data.output]);

  useFullscreenEscape(fullscreen, () => setFullscreen(false));

  // While a setup phase shows, the phase line already explains the empty pane.
  const placeholder = data.phase ? "" : EMPTY_HINT;

  if (compact) {
    return (
      <pre
        ref={preRef}
        aria-label={`${TERMINAL_TITLE} (aperçu)`}
        className="pointer-events-none h-full min-h-0 w-full flex-1 overflow-hidden rounded-md bg-[#001219] p-2 font-mono text-[10px] leading-snug text-[#94d2bd]"
      >
        {error ?? (data.output || placeholder)}
      </pre>
    );
  }

  return (
    <section
      className={cn(
        fill && "flex h-full min-h-0 flex-col",
        fullscreen &&
          "fixed inset-0 z-[60] flex flex-col bg-background p-4 duration-300 animate-in fade-in zoom-in-95",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{TERMINAL_TITLE}</h3>
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            lecture seule
          </span>
          <FullscreenToggle fullscreen={fullscreen} onToggle={() => setFullscreen((v) => !v)} />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : (
        <>
          {data.phase && (
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
              {data.phase}
            </div>
          )}
          <pre
            ref={preRef}
            onScroll={handleScroll}
            tabIndex={0}
            role="log"
            aria-label={`${TERMINAL_TITLE} (sortie, lecture seule)`}
            className={cn(
              "overflow-auto rounded-md bg-[#001219] p-3 font-mono text-xs leading-relaxed text-[#94d2bd]",
              fullscreen || fill ? "min-h-0 flex-1" : "max-h-[60vh] min-h-[12rem]",
            )}
          >
            {data.output || placeholder}
          </pre>
        </>
      )}
    </section>
  );
}
