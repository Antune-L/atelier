import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DEFAULT_CONFIRM_LABEL = "Confirmer";
const DEFAULT_CANCEL_LABEL = "Annuler";
/** Surface of a confirmation popover; exported so a caller hosting `ConfirmBody` matches it. */
export const CONFIRM_POPOVER_CLASSES = "w-[280px] p-3";

export interface ConfirmProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Disables both buttons and shows a spinner on confirm. */
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmActionsProps {
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmActions({
  confirmLabel,
  cancelLabel,
  destructive,
  busy,
  onCancel,
  onConfirm,
}: ConfirmActionsProps) {
  return (
    <>
      <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        size="sm"
        variant={destructive ? "destructive" : "default"}
        disabled={busy}
        onClick={onConfirm}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {confirmLabel}
      </Button>
    </>
  );
}

function useConfirmRunner(
  onConfirm: () => void | Promise<void>,
  close: () => void,
): { pending: boolean; run: () => void } {
  const [pending, setPending] = useState(false);

  const run = (): void => {
    const finish = (): void => {
      setPending(false);
      close();
    };
    const result = onConfirm();
    if (!(result instanceof Promise)) {
      finish();
      return;
    }
    setPending(true);
    void result.then(finish, () => setPending(false));
  };

  return { pending, run };
}

/**
 * Title, description and buttons of a confirmation, without its own surface — so a caller that
 * already owns a popover (e.g. an actions menu) can host the confirmation in place.
 */
export function ConfirmBody({
  title,
  description,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  cancelLabel = DEFAULT_CANCEL_LABEL,
  destructive = false,
  busy = false,
  onConfirm,
  onDismiss,
}: ConfirmProps & { onDismiss: () => void }) {
  const { pending, run } = useConfirmRunner(onConfirm, onDismiss);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description === undefined ? null : (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <ConfirmActions
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          destructive={destructive}
          busy={busy || pending}
          onCancel={onDismiss}
          onConfirm={run}
        />
      </div>
    </div>
  );
}

export function ConfirmPopover({
  children,
  open,
  onOpenChange,
  ...confirm
}: ConfirmProps & {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;

  const setOpen = (next: boolean): void => {
    if (open === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent className={CONFIRM_POPOVER_CLASSES}>
        <ConfirmBody {...confirm} onDismiss={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  cancelLabel = DEFAULT_CANCEL_LABEL,
  destructive = false,
  busy = false,
  onConfirm,
  open,
  onCancel,
}: ConfirmProps & { open: boolean; onCancel: () => void }) {
  const { pending, run } = useConfirmRunner(onConfirm, onCancel);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      size="sm"
      title={title}
      description={description}
      footer={
        <ConfirmActions
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          destructive={destructive}
          busy={busy || pending}
          onCancel={onCancel}
          onConfirm={run}
        />
      }
    />
  );
}
