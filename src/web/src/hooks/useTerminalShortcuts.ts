import { useEffect, useRef } from "react";

import type { SplitOrientation } from "@/components/terminals/tree";

/** CustomEvent name — the desktop main process dispatches this when a menu accelerator fires. */
export const ATELIER_SHORTCUT_EVENT = "atelier-shortcut";

interface ShortcutDetail {
  key: string;
  shiftKey?: boolean;
}

function isShortcutDetail(value: unknown): value is ShortcutDetail {
  if (!value || typeof value !== "object") return false;
  if (!("key" in value) || typeof value.key !== "string") return false;
  if ("shiftKey" in value && typeof value.shiftKey !== "boolean") return false;
  return true;
}

interface UseTerminalShortcutsOptions {
  newTerminal: () => Promise<void>;
  split: (orientation: SplitOrientation) => Promise<void>;
  /** Close the focused terminal; return false when nothing was closable. */
  closeTerminal: () => Promise<boolean>;
  /** Open the quit confirmation modal (double ⌘W with no terminal to close). */
  onRequestQuit: () => void;
}

/**
 * Terminals-view shortcuts (⌘T / ⌘W / ⌘D / ⌘⇧D). Listens on `window` in capture phase so keys still
 * fire while xterm has focus, and also handles `atelier-shortcut` events injected by the desktop app
 * when macOS menu accelerators bypass the webview key pipeline.
 */
export function useTerminalShortcuts({
  newTerminal,
  split,
  closeTerminal,
  onRequestQuit,
}: UseTerminalShortcutsOptions): void {
  const newTerminalRef = useRef(newTerminal);
  const splitRef = useRef(split);
  const closeTerminalRef = useRef(closeTerminal);
  const onRequestQuitRef = useRef(onRequestQuit);
  const emptyCloseStreakRef = useRef(0);

  newTerminalRef.current = newTerminal;
  splitRef.current = split;
  closeTerminalRef.current = closeTerminal;
  onRequestQuitRef.current = onRequestQuit;

  useEffect(() => {
    const run = async (key: string, shiftKey: boolean): Promise<void> => {
      // Any non-⌘W action breaks the streak: the quit prompt needs two *consecutive* empty ⌘W.
      if (key === "t") {
        emptyCloseStreakRef.current = 0;
        await newTerminalRef.current();
        return;
      }
      if (key === "d") {
        emptyCloseStreakRef.current = 0;
        await splitRef.current(shiftKey ? "column" : "row");
        return;
      }
      if (key === "w") {
        const closed = await closeTerminalRef.current();
        if (closed) {
          emptyCloseStreakRef.current = 0;
          return;
        }
        emptyCloseStreakRef.current += 1;
        if (emptyCloseStreakRef.current >= 2) {
          emptyCloseStreakRef.current = 0;
          onRequestQuitRef.current();
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key !== "t" && key !== "w" && key !== "d") return;
      event.preventDefault();
      event.stopPropagation();
      void run(key, event.shiftKey);
    };

    const onCustom = (event: Event): void => {
      if (!(event instanceof CustomEvent)) return;
      if (!isShortcutDetail(event.detail)) return;
      void run(event.detail.key.toLowerCase(), event.detail.shiftKey ?? false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener(ATELIER_SHORTCUT_EVENT, onCustom);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener(ATELIER_SHORTCUT_EVENT, onCustom);
    };
  }, []);
}
