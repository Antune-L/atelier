import { ChevronsUpDown, Palette } from "lucide-react";

import { Select } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { THEMES, type Theme } from "@/lib/theme";

function isTheme(value: string): value is Theme {
  return THEMES.some((t) => t.value === value);
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative">
      <Palette className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Select
        value={theme}
        onChange={(e) => {
          if (isTheme(e.target.value)) setTheme(e.target.value);
        }}
        className="appearance-none bg-card pl-8 pr-8"
        aria-label="Choisir le thème"
      >
        {THEMES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
