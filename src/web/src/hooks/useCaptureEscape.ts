import { useEffect } from "react";

/**
 * While `active`, Escape runs `exit` and never reaches the surrounding Radix layer.
 * Used by surfaces that live inside a sheet but must close on their own first:
 * fullscreen terminals and the PRD search bar.
 */
export function useCaptureEscape(active: boolean, exit: () => void): void {
  // NOTE: Radix's dismissable layer registers its Escape listener on `document` in the capture
  // phase (@radix-ui/react-dismissable-layer). The capture path runs window before document, so
  // this window-capture listener fires first and `stopPropagation` keeps the event from ever
  // reaching Radix — the inner surface closes instead of the sheet behind it.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [active, exit]);
}
