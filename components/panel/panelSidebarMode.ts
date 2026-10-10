/**
 * Panel sidebar default: expanded on desktop, collapsed on small screens.
 * User toggle overrides and persists across Panel navigation (sessionStorage).
 */

export type SidebarMode = "expanded" | "collapsed";

const STORAGE_KEY = "sayban.panel.sidebarMode";
const MOBILE_MQ = "(max-width: 640px)";

export function getPageDefaultSidebarMode(
  _page: string | undefined
): SidebarMode {
  if (typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches) {
    return "collapsed";
  }
  return "expanded";
}

export function readStoredSidebarMode(): SidebarMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === "expanded" || raw === "collapsed") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredSidebarMode(mode: SidebarMode) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function resolveSidebarMode(page: string | undefined): SidebarMode {
  return readStoredSidebarMode() ?? getPageDefaultSidebarMode(page);
}

export const PANEL_NAV_TOGGLE_EVENT = "sayban-panel-nav-toggle";
export const PANEL_NAV_SET_EVENT = "sayban-panel-nav-set";

export function requestPanelNavToggle() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PANEL_NAV_TOGGLE_EVENT));
}

export function requestPanelNavSet(mode: SidebarMode) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PANEL_NAV_SET_EVENT, { detail: { mode } })
  );
}
