import { forwardRef, useMemo, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const BASE =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(BASE, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(BASE, "min-h-[80px]", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-sm font-medium leading-none", className)} {...props} />
  ),
);
Label.displayName = "Label";

interface BranchComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  className?: string;
}

/**
 * Free-text branch input with a custom suggestion list (remote branches).
 * Allows typing any branch name (including ones not yet on origin).
 */
export function BranchCombobox({ id, value, onChange, options, disabled, className }: BranchComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = id ? `${id}-listbox` : undefined;

  const filteredOptions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((b) => b.toLowerCase().includes(q));
  }, [options, value]);

  const showList = open && !disabled && filteredOptions.length > 0;

  const close = (): void => {
    setOpen(false);
  };

  const selectOption = (branch: string): void => {
    onChange(branch);
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (containerRef.current?.contains(e.relatedTarget)) return;
          close();
        }}
        disabled={disabled}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls={showList ? listboxId : undefined}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        placeholder={disabled ? "Chargement…" : "Branche (existante ou nouvelle)"}
        autoComplete="off"
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
        >
          {filteredOptions.map((b) => (
            <li
              key={b}
              role="option"
              aria-selected={b === value}
              className="cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(b);
              }}
            >
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
