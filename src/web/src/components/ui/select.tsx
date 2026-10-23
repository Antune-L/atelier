import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const WRAPPER_UTILITY =
  /^-?(?:w|min-w|max-w|m|mx|my|mt|mr|mb|ml|ms|me|basis|order|col|row)-|^(?:flex-(?:1|auto|none|initial)|grow(?:-.+)?|shrink(?:-.+)?|self-.+|justify-self-.+|place-self-.+)$/;

// Width and placement classes belong on the wrapper so the chevron follows the field.
export function splitSelectClassName(className: string | undefined): { layout: string; visual: string } {
  const layout: string[] = [];
  const visual: string[] = [];
  for (const token of (className ?? "").split(/\s+/).filter(Boolean)) {
    const utility = (token.split(":").pop() ?? token).replace(/^!/, "");
    (WRAPPER_UTILITY.test(utility) ? layout : visual).push(token);
  }
  return { layout: layout.join(" "), visual: visual.join(" ") };
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    const { layout, visual } = splitSelectClassName(className);
    return (
      <span className={cn("relative inline-flex", layout)}>
        <select
          ref={ref}
          className={cn(
            "peer h-9 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            visual,
            "pr-9",
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-50"
        />
      </span>
    );
  },
);
Select.displayName = "Select";
