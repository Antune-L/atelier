/** CustomEvent name — the desktop main process dispatches this when a menu accelerator fires. */
export const ATELIER_SHORTCUT_EVENT = "atelier-shortcut";

export interface ShortcutDetail {
  key: string;
}

export function isShortcutDetail(value: unknown): value is ShortcutDetail {
  if (!value || typeof value !== "object") return false;
  return "key" in value && typeof value.key === "string";
}
