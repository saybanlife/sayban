/**
 * Panel light/dark theme — scoped to `/panel` (wide shell).
 * Persists in localStorage; applied on `html` as class `dark` + data-panel-theme.
 */

export const PANEL_THEME_STORAGE_KEY = "sayban-panel-theme";
export type PanelTheme = "light" | "dark";

export function readStoredPanelTheme(): PanelTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem(PANEL_THEME_STORAGE_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyPanelTheme(theme: PanelTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.panelTheme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export function writePanelTheme(theme: PanelTheme): void {
  try {
    localStorage.setItem(PANEL_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
  applyPanelTheme(theme);
}

export function togglePanelTheme(current: PanelTheme): PanelTheme {
  const next: PanelTheme = current === "dark" ? "light" : "dark";
  writePanelTheme(next);
  return next;
}

/** Clear dark class when leaving the panel so the public app stays light. */
export function clearPanelThemeClass(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  delete root.dataset.panelTheme;
  root.classList.remove("dark");
  root.style.colorScheme = "";
}
