import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker, getDefaultClassNames, type ChevronProps } from "react-day-picker";
import { fr } from "react-day-picker/locale";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONDAY = 1;

export type CalendarProps = ComponentProps<typeof DayPicker>;

function CalendarChevron({ className, orientation }: ChevronProps) {
  const iconClassName = cn("size-4", className);
  if (orientation === "left") return <ChevronLeft className={iconClassName} aria-hidden />;
  if (orientation === "right") return <ChevronRight className={iconClassName} aria-hidden />;
  return <ChevronDown className={iconClassName} aria-hidden />;
}

/** shadcn calendar (react-day-picker) in French, weeks starting on Monday, themed with the app tokens. */
export function Calendar({ className, classNames, showOutsideDays = true, components, ...props }: CalendarProps) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      locale={fr}
      weekStartsOn={MONDAY}
      showOutsideDays={showOutsideDays}
      className={cn("w-fit p-2", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4", defaults.months),
        month: cn("flex w-full flex-col gap-2", defaults.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaults.nav),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 select-none p-0 text-muted-foreground aria-disabled:opacity-50",
          defaults.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 select-none p-0 text-muted-foreground aria-disabled:opacity-50",
          defaults.button_next,
        ),
        month_caption: cn("flex h-7 w-full items-center justify-center px-8", defaults.month_caption),
        caption_label: cn("select-none text-sm font-medium first-letter:uppercase", defaults.caption_label),
        month_grid: cn("w-full border-collapse", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn("w-8 select-none py-1 text-2xs font-normal text-muted-foreground", defaults.weekday),
        week: cn("mt-0.5 flex w-full", defaults.week),
        day: cn("relative p-0 text-center text-xs", defaults.day),
        day_button: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          defaults.day_button,
        ),
        selected: cn(
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90",
          defaults.selected,
        ),
        today: cn("[&>button]:bg-accent [&>button]:text-accent-foreground", defaults.today),
        outside: cn("text-muted-foreground opacity-50", defaults.outside),
        disabled: cn(
          "text-muted-foreground opacity-45 [&>button]:cursor-default [&>button]:hover:bg-transparent",
          defaults.disabled,
        ),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{ Chevron: CalendarChevron, ...components }}
      {...props}
    />
  );
}
