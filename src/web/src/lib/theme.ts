export type Theme = "light" | "dark";

export type ThemePalette = "atelier" | "t3-code" | "t3-chat" | "grove" | "ocean" | "ember" | "iris";

export const THEME_CHANGED_EVENT = "atelier:theme-changed";

interface ThemeOption {
  value: Theme;
  label: string;
  className: string;
}

interface ThemePaletteOption {
  value: ThemePalette;
  label: string;
  description: string;
}

export const THEMES: ThemeOption[] = [
  { value: "dark", label: "Sombre", className: "dark" },
  { value: "light", label: "Clair", className: "" },
];

export const THEME_PALETTES: ThemePaletteOption[] = [
  { value: "atelier", label: "Atelier", description: "La palette actuelle, avec son sombre doux." },
  { value: "t3-code", label: "T3 Code", description: "Neutres et contrastes sobres." },
  { value: "t3-chat", label: "T3 Chat", description: "Rose et prune." },
  { value: "grove", label: "Grove", description: "Verts et tons naturels." },
  { value: "ocean", label: "Ocean", description: "Bleus et ardoise." },
  { value: "ember", label: "Ember", description: "Orange et tons chauds." },
  { value: "iris", label: "Iris", description: "Violets et lavande." },
];

const DEFAULT_THEME: Theme = "dark";
const DEFAULT_PALETTE: ThemePalette = "atelier";
const STORAGE_KEY = "theme";
const PALETTE_STORAGE_KEY = "theme-palette";

function isTheme(value: string | null): value is Theme {
  return THEMES.some((t) => t.value === value);
}

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function getStoredThemePalette(): ThemePalette {
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  return THEME_PALETTES.find((palette) => palette.value === stored)?.value ?? DEFAULT_PALETTE;
}

export function applyThemePalette(palette: ThemePalette): void {
  document.documentElement.dataset.palette = palette;
  localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
}

export function applyTheme(theme: Theme): void {
  const { classList } = document.documentElement;
  for (const { className } of THEMES) {
    if (className) classList.remove(className);
  }
  const next = THEMES.find((t) => t.value === theme);
  if (next?.className) classList.add(next.className);
  localStorage.setItem(STORAGE_KEY, theme);
  applyThemePalette(getStoredThemePalette());
}
