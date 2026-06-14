import { useEffect } from "react";

/**
 * WKWebView (desktop Electrobun) joue le system beep macOS quand un keydown
 * atteint la responder chain AppKit sans être consommé. Échap → cancelOperation:
 * n'a aucun responder, donc beep sauf si la page appelle preventDefault().
 * Capture + always-on : fire même quand un handler stopPropagation() avant la
 * phase bubble (terminal fullscreen). preventDefault ne bloque PAS les listeners
 * JS, donc fermeture du modal / sortie fullscreen continuent de marcher.
 */
export function useSuppressEscapeBeep(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !event.isComposing) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
