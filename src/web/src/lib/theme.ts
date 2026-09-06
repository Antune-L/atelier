export type Theme = "light" | "dark";

interface ThemeOption {
  value: Theme;
  label: string;
  /** Class applied to <html>; empty for the light theme. */
  className: string;
}

export const THEMES: ThemeOption[] = [
  { value: "dark", label: "Sombre", className: "dark" },
  { value: "light", label: "Clair", className: "" },
];

const DEFAULT_THEME: Theme = "dark";
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
  const next = THEMES.find((t) => t.value === theme);
  if (next?.className) classList.add(next.className);
  localStorage.setItem(STORAGE_KEY, theme);
}
