import type { NextRouter } from "next/router";
import { panelAppHref } from "./panelRouteParams";

export const PANEL_CENTERS_PATH = "/panel/centers/";

export function centerDetailPath(
  rowKey: unknown,
  row?: Record<string, unknown>
): string | null {
  const id = String(row?.id ?? rowKey ?? "").trim();
  return /^\d+$/.test(id) ? panelAppHref(`/panel/center-${id}`) : null;
}

export function centerInfoPath(centerId: unknown): string | null {
  const id = String(centerId ?? "").trim();
  return /^\d+$/.test(id) ? panelAppHref(`/panel/center_info-${id}`) : null;
}

/** True for edit workspace `/panel/center-{id}` (not registration review). */
export function isCenterDetailPage(page: string): boolean {
  return page.startsWith("center-") && !page.startsWith("center_info");
}

export function isCenterInfoPage(page: string): boolean {
  return /^center_info-\d+$/.test(page);
}

/** Resolve center id from `/panel/center-123` or `/panel/center?id=123`. */
export function centerIdFromPanelPage(
  page: string,
  queryId: string | string[] | undefined
): string | null {
  if (isCenterDetailPage(page)) {
    const id = page.slice("center-".length).trim();
    return id || null;
  }
  if (page === "center") {
    const id = Array.isArray(queryId) ? queryId[0] : queryId;
    const trimmed = String(id ?? "").trim();
    return trimmed || null;
  }
  return null;
}

/**
 * Sidebar `selecteItem` should stay on «مدیریت مراکز» while viewing a center
 * detail or registration review, not the raw `center-12` / `center_info-12`
 * route segment.
 */
export function panelMenuSelectionForPage(page: string): string {
  const raw = String(page || "").trim();
  if (
    raw === "centers" ||
    isCenterDetailPage(raw) ||
    isCenterInfoPage(raw)
  ) {
    return "centers";
  }
  return raw || "dashboard";
}

/**
 * Explicit «لیست مراکز» / «بازگشت به لیست» must land on the list without
 * stacking another `/panel/centers` entry (push caused browser Back to reopen
 * the center page).
 */
export function navigateToCentersList(router: NextRouter): void {
  void router.replace(panelAppHref(PANEL_CENTERS_PATH));
}
