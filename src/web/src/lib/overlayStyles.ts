/** Field label styling shared by the ticket sheet and the tool dialogs (Console: mono, 2xs, muted). */
export const FIELD_LABEL_CLASSES =
  "font-mono text-2xs uppercase tracking-wider text-muted-foreground";

/**
 * Footer bar of a panel rendered inside a `Dialog` body: the negative margins cancel the body's
 * `px-4 py-3` so the separator spans the full dialog width, and `sticky` keeps it visible.
 */
export const PANEL_FOOTER_CLASSES =
  "sticky bottom-0 -mx-4 -mb-3 mt-1 flex shrink-0 justify-end gap-2 border-t border-border bg-card px-4 py-2";

/** Footer bar of a `Sheet`: full-width separator at the bottom of the sheet body. */
export const SHEET_FOOTER_CLASSES =
  "flex shrink-0 justify-end gap-2 border-t border-border px-4 py-2";
