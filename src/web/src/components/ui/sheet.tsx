import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { KeyboardEventHandler, ReactNode } from "react";

import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";

export type SheetSize = "md" | "lg" | "xl";

const SHEET_WIDTH: Record<SheetSize, string> = {
  md: "w-[480px]",
  lg: "w-[760px]",
  xl: "w-[960px]",
};

const SHEET_PUSHED_OFFSET: Record<SheetSize, string> = {
  md: "translateX(-480px)",
  lg: "translateX(-760px)",
  xl: "translateX(-960px)",
};

const DEFAULT_SIZE: SheetSize = "lg";

const OVERLAY_CLASSES =
  "fixed inset-0 z-sheet bg-background/60 duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 motion-reduce:animate-none";

const CONTENT_CLASSES =
  "fixed inset-y-0 right-0 z-sheet flex max-w-full flex-col border-l border-border bg-card text-card-foreground shadow-xl outline-none duration-150 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-100 motion-reduce:animate-none";

const CLOSE_CLASSES =
  "ml-auto shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const BREADCRUMB_SEPARATOR = "›";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: SheetSize;
  /** Width of the sheet stacked on top of this one; shifts this sheet left by that width. */
  pushedBy?: SheetSize | null;
  /** Stack breadcrumb rendered above the title, e.g. ["Ticket", "PRD"] (last item is the current one). */
  breadcrumb?: string[];
  title: ReactNode;
  /** Optional mono tokens / badges rendered right of the title. */
  titleAside?: ReactNode;
  /** Optional row under the header (tabs). */
  subheader?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Forwarded to the content element, e.g. for arrow-key navigation while focus is trapped. */
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}

export function Sheet({
  open,
  onOpenChange,
  size = DEFAULT_SIZE,
  pushedBy = null,
  breadcrumb,
  title,
  titleAside,
  subheader,
  children,
  className,
  onKeyDown,
}: SheetProps) {
  const pushedStyle = pushedBy ? { transform: SHEET_PUSHED_OFFSET[pushedBy] } : undefined;
  const hasBreadcrumb = breadcrumb !== undefined && breadcrumb.length > 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY_CLASSES} />
        <DialogPrimitive.Content
          className={cn(
            CONTENT_CLASSES,
            SHEET_WIDTH[size],
            pushedBy ? "transition-transform duration-150" : undefined,
            className,
          )}
          style={pushedStyle}
          onKeyDown={onKeyDown}
        >
          <div className="shrink-0">
            {hasBreadcrumb ? (
              <div className={cn("flex items-center gap-1 px-4 pt-2", FIELD_LABEL_CLASSES)}>
                {breadcrumb.map((segment, index) => (
                  <span
                    key={`${segment}-${index}`}
                    className={index === breadcrumb.length - 1 ? "text-foreground" : undefined}
                  >
                    {index > 0 ? `${BREADCRUMB_SEPARATOR} ` : null}
                    {segment}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex h-10 items-center gap-2 border-b border-border px-4">
              <DialogPrimitive.Title className="truncate text-sm font-medium">
                {title}
              </DialogPrimitive.Title>
              {titleAside}
              <DialogPrimitive.Close className={CLOSE_CLASSES} aria-label="Fermer">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            {subheader}
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
