import { useEffect } from "react";

/**
 * WKWebView (desktop Electrobun) joue le system beep macOS quand un keydown
 * atteint la responder chain AppKit sans être consommé. Échap → cancelOperation:
 * n'a aucun responder, donc beep sauf si la page appelle preventDefault().
 * Bubble phase, en dernier : Radix (dismissable layer) ignore un Escape déjà
 * defaultPrevented, donc il faut le laisser fermer sa couche avant nous. Les
 * handlers qui consomment Escape en capture (terminal fullscreen, lightbox)
 * font leur propre preventDefault.
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
