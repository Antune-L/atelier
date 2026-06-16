import { Maximize2, Minimize2 } from "lucide-react";

/** Header title shared by both terminal views. */
export const TERMINAL_TITLE = "Terminal";

interface FullscreenToggleProps {
  fullscreen: boolean;
  onToggle: () => void;
}

/** The expand/collapse button in a terminal view's header. */
export function FullscreenToggle({ fullscreen, onToggle }: FullscreenToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-muted-foreground transition-colors hover:text-foreground"
      aria-label={fullscreen ? "Réduire le terminal" : "Agrandir le terminal"}
      title={fullscreen ? "Réduire" : "Plein écran"}
    >
      {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>
  );
}
