import { Loader2, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverMenuItem, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColumnMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  title?: string;
  busy?: boolean;
}

interface ColumnActionsMenuProps {
  items: ColumnMenuItem[];
  ariaLabel: string;
}

const MENU_CONTENT_CLASSES = "min-w-48";

export function ColumnActionsMenu({ items, ariaLabel }: ColumnActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (item: ColumnMenuItem): void => {
    item.onSelect();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button
          type="button"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label={ariaLabel}
          aria-haspopup="menu"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          Actions
        </button>
      </PopoverTrigger>
      <PopoverContent role="menu" className={MENU_CONTENT_CLASSES}>
        {items.map((item) => {
          const Icon = item.busy === true ? Loader2 : item.icon;
          return (
            <PopoverMenuItem
              key={item.label}
              role="menuitem"
              onClick={() => handleSelect(item)}
              disabled={item.disabled}
              title={item.title}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", item.busy === true && "animate-spin")} />
              <span className="flex flex-col gap-0.5 text-left"><span>{item.label}</span>{item.title && <span className="text-2xs font-normal text-muted-foreground">{item.title}</span>}</span>
            </PopoverMenuItem>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
