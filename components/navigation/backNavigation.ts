import type { NextRouter } from "next/router";

/**
 * Whether there is an in-app entry to pop. Next keeps `idx` (older versions) or
 * `key` (newer) on the history state, which is more reliable than sniffing
 * `document.referrer`; `history.length` is the last resort, since it counts
 * entries belonging to other sites too.
 */
function canGoBackWithinApp(): boolean {
  if (typeof window === "undefined") return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === "number") return idx > 0;
  return window.history.length > 1;
}

/**
 * Back that pops instead of pushing.
 *
 * Pushing the predecessor is what made the support flow loop: the two screens
 * kept pushing each other onto the stack, so browser Back could never escape.
 * The same shape existed between the reservation detail and booking list. Pop
 * when there is an in-app entry to pop; otherwise `replace` (never `push`) so a
 * deep link still lands somewhere sensible without growing the stack.
 */
export function goBackOrReplace(router: NextRouter, fallback: string): void {
  if (canGoBackWithinApp()) {
    router.back();
    return;
  }
  void router.replace(fallback);
}
