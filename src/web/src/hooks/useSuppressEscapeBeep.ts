import { useEffect } from "react";

/**
 * WKWebView (Electrobun desktop) plays the macOS system beep when a keydown
 * reaches the AppKit responder chain without being consumed. Escape →
 * cancelOperation: has no responder, hence the beep unless the page calls
 * preventDefault(). Bubble phase, last: Radix (dismissable layer) ignores an
 * Escape that is already defaultPrevented, so it must be allowed to close its
 * layer before we do anything. Handlers that consume Escape in the capture
 * phase (terminal fullscreen, lightbox) do their own preventDefault.
 */
export function useSuppressEscapeBeep(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !event.isComposing) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
