import { Plus } from "lucide-react";
import type { ReactNode } from "react";

const UNSAVED_LABEL = "Modifications non enregistrées";
const SAVED_LABEL = "Enregistré";

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function footerMessage(dirty: boolean, justSaved: boolean): string {
  if (justSaved) return SAVED_LABEL;
  if (dirty) return UNSAVED_LABEL;
  return "";
}

interface SettingsFooterProps {
  dirty: boolean;
  justSaved: boolean;
  children: ReactNode;
}

/** Editor footer: the save state on the left, the panel's action buttons on the right. */
export function SettingsFooter({ dirty, justSaved, children }: SettingsFooterProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">{footerMessage(dirty, justSaved)}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

interface DashedAddButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/** Full-width dashed "add an item" affordance closing a settings list. */
export function DashedAddButton({ label, onClick, disabled = false }: DashedAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-input px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
