export const SCROLL_COMPACT_ON = 36;
export const SCROLL_COMPACT_OFF = 8;

export function nextCompactState(compact: boolean, scrollY: number): boolean {
  if (!compact && scrollY >= SCROLL_COMPACT_ON) return true;
  if (compact && scrollY <= SCROLL_COMPACT_OFF) return false;
  return compact;
}

export function readScrollTop(target: EventTarget | null): number {
  if (!target || target === window || target === document) {
    return (
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }
  const el = target as HTMLElement;
  return typeof el.scrollTop === "number" ? el.scrollTop : 0;
}

export function collectScrollTargets(from: HTMLElement | null): Array<EventTarget> {
  const targets: Array<EventTarget> = [
    window,
    document,
    document.documentElement,
    document.body
  ];
  let node = from?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if (oy === "auto" || oy === "scroll" || oy === "overlay") {
      targets.push(node);
    }
    node = node.parentElement;
  }
  return targets;
}

export function maxScrollTop(targets: Array<EventTarget>): number {
  let max = 0;
  for (const target of targets) {
    max = Math.max(max, readScrollTop(target));
  }
  return max;
}
