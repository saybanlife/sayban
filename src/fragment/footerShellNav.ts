const FOOTER_SHELL_TABS = new Set(["home", "booking", "user", "reminder"]);

/**
 * Footer tabs share one Plasmic shell (`[page]/[[...slug]]`). Switching
 * between `/home/`, `/booking/`, `/user/`, `/reminder/` is a view swap, not a document load.
 * Nested paths (center, favorites, …) still count as meaningful transitions.
 */
export function isFooterShellLanding(path: string): boolean {
  const parts = String(path || "")
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean);
  return parts.length === 1 && FOOTER_SHELL_TABS.has(parts[0].toLowerCase());
}
