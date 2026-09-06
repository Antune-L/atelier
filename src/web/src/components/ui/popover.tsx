import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

import { cn } from "@/lib/utils";

const DEFAULT_SIDE_OFFSET = 4;

const CONTENT_CLASSES =
  "z-popover rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:duration-100 motion-reduce:animate-none";

const MENU_ITEM_CLASSES =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = forwardRef<
  ElementRef<typeof PopoverPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ asChild = true, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} asChild={asChild} {...props} />
));
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "end", sideOffset = DEFAULT_SIDE_OFFSET, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(CONTENT_CLASSES, className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export interface PopoverMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

const PopoverMenuItem = forwardRef<HTMLButtonElement, PopoverMenuItemProps>(
  ({ className, destructive = false, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(MENU_ITEM_CLASSES, destructive ? "text-danger" : undefined, className)}
      {...props}
    />
  ),
);
PopoverMenuItem.displayName = "PopoverMenuItem";

export { Popover, PopoverTrigger, PopoverContent, PopoverMenuItem };
