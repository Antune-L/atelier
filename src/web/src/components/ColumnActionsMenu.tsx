import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ColumnMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  title?: string;
}

interface ColumnActionsMenuProps {
  items: ColumnMenuItem[];
  ariaLabel: string;
}

export function ColumnActionsMenu({ items, ariaLabel }: ColumnActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Restore focus to the trigger on close so keyboard users aren't dropped onto <body>.
  const close = (): void => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelect = (item: ColumnMenuItem): void => {
    if (item.disabled) return;
    item.onSelect();
    close();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      close();
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          {/* Click-outside without a document listener: a transparent full-screen backdrop catches the click. */}
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                  title={item.title}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    item.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-popover-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
