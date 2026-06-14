import { useState } from "react";

import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

interface UseThemeResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/** Theme is applied to <html> at startup (main.tsx); this only re-renders the picker. */
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const setTheme = (next: Theme): void => {
    applyTheme(next);
    setThemeState(next);
  };

  return { theme, setTheme };
}
