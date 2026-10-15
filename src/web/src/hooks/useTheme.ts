import { useState } from "react";

import {
  applyTheme,
  applyThemePalette,
  getStoredTheme,
  getStoredThemePalette,
  type Theme,
  type ThemePalette,
} from "@/lib/theme";

interface UseThemeResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  palette: ThemePalette;
  setPalette: (palette: ThemePalette) => void;
}

export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [palette, setPaletteState] = useState<ThemePalette>(getStoredThemePalette);

  const setTheme = (next: Theme): void => {
    applyTheme(next);
    setThemeState(next);
  };

  const setPalette = (next: ThemePalette): void => {
    applyThemePalette(next);
    setPaletteState(next);
  };

  return { theme, setTheme, palette, setPalette };
}
