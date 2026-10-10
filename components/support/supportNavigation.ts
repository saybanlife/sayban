/**
 * Back-navigation for the support flow.
 *
 * The chat screen used to `push` the support landing while the landing called
 * `router.back()`, so the two screens kept pushing each other onto the history
 * stack and the user could never leave. The chat now pops the entry the landing
 * pushed, and a short-window bounce counter sends the user home if they still
 * end up ping-ponging between the two screens.
 */

const BOUNCE_KEY = "sayban.support.bounces";

/** Consecutive back presses inside the support flow before we bail out home. */
const BOUNCE_LIMIT = 3;
/** Presses further apart than this are treated as deliberate, not a loop. */
const BOUNCE_WINDOW_MS = 4000;

type BounceState = { count: number; at: number };

function readBounce(): BounceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BOUNCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BounceState;
    if (typeof parsed?.count !== "number" || typeof parsed?.at !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeBounce(state: BounceState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BOUNCE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Call when the support flow is entered from outside so old counts don't leak. */
export function resetSupportBounce() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(BOUNCE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Records a back press inside the support flow.
 * Returns true when the user appears to be stuck in a loop.
 */
export function registerSupportBounce(): boolean {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  const previous = readBounce();
  const next: BounceState =
    previous && now - previous.at < BOUNCE_WINDOW_MS
      ? { count: previous.count + 1, at: now }
      : { count: 1, at: now };
  writeBounce(next);
  return next.count >= BOUNCE_LIMIT;
}

/**
 * Whether there is an in-app entry to pop. Next.js keeps an `idx` on the
 * history state, which is far more reliable than sniffing `document.referrer`.
 */
export function canGoBackWithinApp(): boolean {
  if (typeof window === "undefined") return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === "number") return idx > 0;
  return window.history.length > 1;
}
