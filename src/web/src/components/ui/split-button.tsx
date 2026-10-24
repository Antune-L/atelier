import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverMenuItem, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SplitButtonProps {
  label: string;
  Icon?: LucideIcon;
  title?: string;
  onClick: () => void;
  mainDisabled?: boolean;
  menuDisabled?: boolean;
  menuLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  /** Menu panes, rendered in a popover anchored to the whole button group. */
  children: ReactNode;
}

/** Primary button with an attached chevron opening a menu of alternative actions. */
export function SplitButton({
  label,
  Icon,
  title,
  onClick,
  mainDisabled = false,
  menuDisabled = false,
  menuLabel,
  open,
  onOpenChange,
  className,
  contentClassName,
  children,
}: SplitButtonProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className={cn("inline-flex", className)}>
          <Button
            type="button"
            size="sm"
            title={title}
            disabled={mainDisabled}
            onClick={onClick}
            className="flex-1 rounded-r-none"
          >
            {Icon !== undefined && <Icon className="h-3.5 w-3.5" />}
            {label}
          </Button>
          <PopoverTrigger>
            <Button
              type="button"
              size="sm"
              aria-label={menuLabel}
              disabled={menuDisabled}
              className="rounded-l-none border-l border-primary-foreground/20 px-2"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent className={cn("w-80", contentClassName)}>{children}</PopoverContent>
    </Popover>
  );
}

interface SplitMenuItemProps {
  label: string;
  description?: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** Menu entry with an optional muted description line under its label. */
export function SplitMenuItem({ label, description, destructive = false, disabled = false, onClick }: SplitMenuItemProps) {
  return (
    <PopoverMenuItem destructive={destructive} disabled={disabled} onClick={onClick} className="items-start">
      <span className="flex flex-col gap-0.5">
        <span>{label}</span>
        {description !== undefined && <span className="text-2xs font-normal text-muted-foreground">{description}</span>}
      </span>
    </PopoverMenuItem>
  );
}
