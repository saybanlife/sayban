import * as React from "react";

/**
 * Staged hide-on-scroll for the Home landing page.
 *
 * Stage 0  nothing hidden (top of page)
 * Stage 1  search bar collapsed to its icon only
 * Stage 2  promo banner slid up out of view
 * Stage 3  service cards slid up out of view
 *
 * Beyond stage 3 scrolling is left completely alone.
 *
 * Each stage is released a bit earlier than it was engaged so the return trip
 * never feels sticky, and stages are always emitted in order (a jump from 0 to
 * 3 still runs through 1 and 2) which is what keeps the reverse smooth.
 */

export type HomeScrollStage = 0 | 1 | 2 | 3;

const ENGAGE = [72, 160, 260] as const;
const RELEASE = [48, 128, 220] as const;
export const HOME_SEARCH_EXPAND_EVENT = "sayban:home-search-expand";

export function resolveHomeScrollTarget(
  scrollY: number,
  current: HomeScrollStage
): HomeScrollStage {
  let target = current;
  while (target < 3 && scrollY >= ENGAGE[target as 0 | 1 | 2]) target += 1;
  while (target > 0 && scrollY <= RELEASE[target - 1]!) target -= 1;
  return target as HomeScrollStage;
}

export function nextHomeScrollStage(
  current: HomeScrollStage,
  target: HomeScrollStage
): HomeScrollStage {
  if (current === target) return current;
  return (current + Math.sign(target - current)) as HomeScrollStage;
}

/**
 * Runs the scroll listener without rendering: the stage is applied to a CSS
 * custom property so the browser's transition engine does the animation work.
 */
export function useHomeScrollStage(
  rootRef: React.RefObject<HTMLElement | null>,
  enabled: boolean
) {
  React.useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || typeof window === "undefined") return;

    let stage: HomeScrollStage = 0;
    let target: HomeScrollStage = 0;
    let frame = 0;
    root.setAttribute("data-scroll-stage", "0");

    const emitNextStage = () => {
      frame = 0;
      if (stage === target) return;
      stage = nextHomeScrollStage(stage, target);
      root.setAttribute("data-scroll-stage", String(stage));
      if (stage !== target) frame = requestAnimationFrame(emitNextStage);
    };

    const readScroll = () => {
      const y = Math.max(
        window.scrollY,
        document.documentElement.scrollTop,
        document.body.scrollTop,
        0
      );
      target = resolveHomeScrollTarget(y, target);
      if (!frame && stage !== target) frame = requestAnimationFrame(emitNextStage);
    };

    const onScroll = () => {
      root.removeAttribute("data-search-expanded");
      readScroll();
    };

    const onExpandSearch = () => root.setAttribute("data-search-expanded", "true");

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", readScroll, { passive: true });
    document.addEventListener(HOME_SEARCH_EXPAND_EVENT, onExpandSearch);
    readScroll();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", readScroll);
      document.removeEventListener(HOME_SEARCH_EXPAND_EVENT, onExpandSearch);
      root.removeAttribute("data-scroll-stage");
      root.removeAttribute("data-search-expanded");
    };
  }, [enabled, rootRef]);
}
