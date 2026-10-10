const ATTR = "data-user-scroll-compact";
/** Smooth ease-out — decelerates into the final pose. */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_FADE = "cubic-bezier(0.4, 0, 0.2, 1)";
const DURATION = 580;

const isShown = (r: DOMRect) => r.width > 0.5 && r.height > 0.5;

function forceReflow(el: HTMLElement) {
  void el.offsetWidth;
}

/**
 * Toggles data-user-scroll-compact on `root` and animates the layout change
 * with FLIP (transform + opacity only).
 *
 * root > section > div (profile stack) > [avatar, name, mobile]
 */
export function setCompactWithFlip(
  root: HTMLElement,
  next: boolean,
  animate = true
) {
  const setAttr = () => {
    if (next) root.setAttribute(ATTR, "1");
    else root.removeAttribute(ATTR);
  };

  const stack = root.querySelector<HTMLElement>(":scope > section > div");
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!stack || !animate || reduce) {
    setAttr();
    return;
  }

  const kids = Array.from(stack.children) as HTMLElement[];
  const origin = next ? "top right" : "top center";

  // FIRST — visual boxes (includes in-flight transforms)
  const first = kids.map(el => ({
    rect: el.getBoundingClientRect(),
    abs: getComputedStyle(el).position === "absolute"
  }));
  const h0 = stack.getBoundingClientRect().height;

  kids.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  stack.getAnimations().forEach(a => a.cancel());

  // LAST — layout snaps; invert immediately so the frame never paints the snap
  setAttr();
  const h1 = stack.getBoundingClientRect().height;

  const plays: Animation[] = [];

  plays.push(
    stack.animate(
      { height: [`${h0}px`, `${h1}px`] },
      { duration: DURATION, easing: EASE, fill: "both" }
    )
  );

  kids.forEach((el, i) => {
    const f = first[i];
    const l = el.getBoundingClientRect();
    const nowAbs = getComputedStyle(el).position === "absolute";
    const wasShown = isShown(f.rect) && !f.abs;

    el.style.transformOrigin = origin;

    if (wasShown && nowAbs) {
      const dx = f.rect.left - l.left;
      const dy = f.rect.top - l.top;
      plays.push(
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }
          ],
          {
            duration: Math.round(DURATION * 0.5),
            easing: EASE_FADE,
            fill: "both"
          }
        )
      );
      return;
    }

    if (f.abs && !nowAbs && isShown(l)) {
      // Re-enters the flow — rise from the compact pose while fading in
      const dx = f.rect.left - l.left;
      const dy = f.rect.top - l.top;
      const s = l.height > 0 && f.rect.height > 0 ? f.rect.height / l.height : 1;
      plays.push(
        el.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) scale(${s})`,
              opacity: 0
            },
            { transform: "none", opacity: 1 }
          ],
          { duration: DURATION, easing: EASE, fill: "both" }
        )
      );
      return;
    }

    if (!wasShown || !isShown(l)) return;

    const dx = f.rect.left - l.left;
    const dy = f.rect.top - l.top;
    // Uniform scale — avatar stays round; name size change stays soft
    const s = l.height > 0 ? f.rect.height / l.height : 1;
    const nearIdentity =
      Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(s - 1) < 0.02;
    if (nearIdentity) return;

    plays.push(
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
          { transform: "none" }
        ],
        { duration: DURATION, easing: EASE, fill: "both" }
      )
    );
  });

  // Clear fill leftovers after the longest run so later layout stays clean
  if (plays.length) {
    void Promise.all(plays.map(a => a.finished.catch(() => undefined))).then(
      () => {
        plays.forEach(a => {
          try {
            a.cancel();
          } catch {
            /* already finished */
          }
        });
        forceReflow(stack);
      }
    );
  }
}
