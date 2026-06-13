import { useCallback, useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** "center" = dialog, "right" = sheet. */
  side?: "center" | "right";
  className?: string;
  /** When true, Escape does not close the modal (e.g. uncommitted input text). */
  disableEscape?: boolean;
  /** Sheet only: span the full viewport width and let children own their scrolling. */
  fullWidth?: boolean;
}

/** Enter/leave transition duration; keep in sync with the `duration-200` classes. */
const TRANSITION_MS = 200;

export function Modal({
  open,
  onClose,
  children,
  side = "center",
  className,
  disableEscape = false,
  fullWidth = false,
}: ModalProps) {
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  // Drive the enter animation one frame after mount/open; reset when closed.
  useEffect(() => {
    if (!open) {
      setEntered(false);
      setClosing(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Play the leave animation, then hand control back to the parent to unmount.
  const requestClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, TRANSITION_MS);
  }, [onClose]);

  // Global Escape-to-close. A window listener legitimately needs an effect.
  useEffect(() => {
    if (!open || disableEscape) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, disableEscape, requestClose]);

  if (!open) return null;
  const isSheet = side === "right";
  const show = entered && !closing;
  const sheetSizing = fullWidth
    ? "max-w-none flex flex-col overflow-hidden"
    : "max-w-4xl overflow-y-auto";
  const panelClasses = isSheet
    ? cn("ml-auto h-full w-full border-l", sheetSizing, show ? "translate-x-0" : "translate-x-full")
    : cn(
        "m-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border",
        show ? "scale-100 opacity-100" : "scale-95 opacity-0",
      );
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm transition-opacity duration-200",
        show ? "opacity-100" : "opacity-0",
      )}
      onMouseDown={requestClose}
      role="presentation"
    >
      <div
        className={cn(
          "border bg-card text-card-foreground shadow-lg transition-all duration-200 ease-out",
          panelClasses,
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children }: { children: ReactNode }) {
  return <div className="shrink-0 border-b px-6 py-4">{children}</div>;
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="space-y-4 px-6 py-4">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 border-t px-6 py-4">{children}</div>;
}
