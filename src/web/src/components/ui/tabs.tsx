import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  options: readonly TabOption<T>[];
  /** null leaves no tab highlighted (e.g. while the default is still loading). */
  value: T | null;
  onChange: (value: T) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

/**
 * Segmented control: a row of single-click buttons replacing a Select for quick picks.
 * Single-choice, so it carries radiogroup/radio semantics (not the ARIA tab pattern).
 */
export function Tabs<T extends string>({ options, value, onChange, className, ...props }: TabsProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn("inline-flex flex-wrap items-center gap-1 rounded-md border border-input bg-background p-1", className)}
      {...props}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded px-2.5 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
