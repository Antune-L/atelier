export type Theme = "light" | "deep-ocean" | "dark";

interface ThemeOption {
  value: Theme;
  label: string;
  /** Class applied to <html>; empty for the default light theme. */
  className: string;
}

export const THEMES: ThemeOption[] = [
  { value: "light", label: "Clair", className: "" },
  { value: "deep-ocean", label: "Deep Ocean", className: "theme-deep-ocean" },
  { value: "dark", label: "Sombre", className: "dark" },
];

const DEFAULT_THEME: Theme = "light";
const STORAGE_KEY = "theme";

function isTheme(value: string | null): value is Theme {
  return THEMES.some((t) => t.value === value);
}

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function applyTheme(theme: Theme): void {
  const { classList } = document.documentElement;
  for (const { className } of THEMES) {
    if (className) classList.remove(className);
  }
  const next = THEMES.find((t) => t.value === theme) ?? THEMES[0];
  if (next?.className) classList.add(next.className);
  localStorage.setItem(STORAGE_KEY, theme);
}
