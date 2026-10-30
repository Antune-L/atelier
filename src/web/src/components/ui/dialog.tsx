import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DialogSize = "sm" | "md" | "lg";

const DIALOG_WIDTH: Record<DialogSize, string> = {
  sm: "w-[400px]",
  md: "w-[560px]",
  lg: "w-[800px]",
};

const DEFAULT_SIZE: DialogSize = "md";

const OVERLAY_CLASSES =
  "fixed inset-0 z-dialog bg-background/60 duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 motion-reduce:animate-none";

const POSITIONER_CLASSES = "pointer-events-none fixed inset-0 z-dialog flex items-center justify-center p-2 sm:p-4";

const CONTENT_CLASSES =
  "pointer-events-auto flex max-h-[calc(100dvh-1rem)] min-w-0 max-w-full flex-col overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-lg outline-none duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:duration-100 motion-reduce:animate-none sm:max-h-[85dvh]";

const CLOSE_CLASSES =
  "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: ComponentProps<typeof DialogPrimitive.Content>["onCloseAutoFocus"];
  size?: DialogSize;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** true = no close button, Escape and outside click ignored (onboarding / quitting). */
  blocking?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  size = DEFAULT_SIZE,
  title,
  description,
  children,
  footer,
  blocking = false,
  className,
}: DialogProps) {
  const preventWhenBlocking = (event: Event): void => {
    if (blocking) event.preventDefault();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY_CLASSES} />
        <div className={POSITIONER_CLASSES}>
          <DialogPrimitive.Content
            className={cn(CONTENT_CLASSES, DIALOG_WIDTH[size], className)}
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={preventWhenBlocking}
            onPointerDownOutside={preventWhenBlocking}
            onInteractOutside={preventWhenBlocking}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
              <DialogPrimitive.Title className="min-w-0 break-words text-sm font-semibold">
                {title}
              </DialogPrimitive.Title>
              {blocking ? null : (
                <DialogPrimitive.Close className={CLOSE_CLASSES} aria-label="Fermer">
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
              {description === undefined ? null : (
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
              {children}
            </div>
            {footer === undefined ? null : (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-card px-4 py-3">
                {footer}
              </div>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
