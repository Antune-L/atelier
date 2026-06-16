import { useEffect } from "react";

/**
 * While `fullscreen` is on, Escape exits it without bubbling to the drawer's own Escape handler.
 * Shared by the terminal views, which both overlay the drawer when expanded.
 */
export function useFullscreenEscape(fullscreen: boolean, exit: () => void): void {
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        exit();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [fullscreen, exit]);
}
