/**
 * Reference-counted document.body scroll lock.
 *
 * Multiple overlays (Fragment page loader + route transition loader, lightbox,
 * etc.) must share one lock. Saving/restoring `style.overflow` per mount races:
 * the first unmount can restore `"hidden"` captured from a sibling still open,
 * leaving the page permanently unscrollable with no overlay visible.
 */

let lockCount = 0;
let savedOverflow = "";

export function getBodyScrollLockCount() {
  return lockCount;
}

/** Acquire a lock; call the returned function exactly once to release. */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  const { body } = document;
  if (lockCount === 0) {
    savedOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    body.setAttribute("data-sayban-scroll-lock", "true");
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      body.style.overflow = savedOverflow;
      body.removeAttribute("data-sayban-scroll-lock");
      savedOverflow = "";
    }
  };
}

/** Test helper — reset module state between unit cases. */
export function resetBodyScrollLockForTests() {
  lockCount = 0;
  savedOverflow = "";
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    document.body.removeAttribute("data-sayban-scroll-lock");
  }
}
