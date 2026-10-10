import * as React from "react";

type StickOptions = {
  /** Changes when the conversation thread identity changes (forces bottom). */
  threadKey?: string | number | null;
  /** Prefer last message id (+ length) so content updates still re-pin. */
  messageKey: string | number;
  /** While true, skip scrolling (e.g. initial empty loading). */
  loading?: boolean;
};

function applyScrollBottom(el: HTMLElement, behavior: ScrollBehavior) {
  const top = Math.max(0, el.scrollHeight - el.clientHeight);
  if (behavior === "smooth" && typeof el.scrollTo === "function") {
    el.scrollTo({ top, behavior: "smooth" });
  } else {
    el.scrollTop = top;
  }
  const anchor = el.querySelector(
    "[data-support-scroll-anchor]"
  ) as HTMLElement | null;
  if (anchor && typeof anchor.scrollIntoView === "function") {
    anchor.scrollIntoView({
      block: "end",
      inline: "nearest",
      behavior: behavior === "smooth" ? "smooth" : "auto"
    });
  }
}

/**
 * Keeps a messages scroller pinned to the bottom after send/receive/load.
 *
 * Root causes this addresses:
 * - `scrollTop = scrollHeight` running before layout paint (short scrollHeight)
 * - deps on `messages.length` alone missing id/content updates
 * - late height growth after the first scroll (wrap / font / composer padding)
 * - ResizeObserver on the overflow container not firing when only content grows
 */
export function useStickMessagesToBottom(
  containerRef: React.RefObject<HTMLElement | null>,
  { threadKey, messageKey, loading = false }: StickOptions
) {
  const pinUntilRef = React.useRef(0);
  const frameRef = React.useRef(0);
  const timersRef = React.useRef<number[]>([]);

  const clearScheduled = React.useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const el = containerRef.current;
      if (!el) return;

      const run = () => applyScrollBottom(el, behavior);
      clearScheduled();
      run();
      frameRef.current = requestAnimationFrame(() => {
        run();
        frameRef.current = requestAnimationFrame(run);
      });
      // Late layout after composer padding / text wrap.
      timersRef.current.push(window.setTimeout(run, 50));
      timersRef.current.push(window.setTimeout(run, 160));
    },
    [clearScheduled, containerRef]
  );

  React.useEffect(() => {
    if (loading) return;
    pinUntilRef.current = Date.now() + 600;
    scrollToBottom("auto");

    const el = containerRef.current;
    if (!el) {
      return () => clearScheduled();
    }

    const onMaybePin = () => {
      if (Date.now() <= pinUntilRef.current) {
        applyScrollBottom(el, "auto");
      }
    };

    // Content growth inside overflow:auto does not resize the container box, so
    // watch the DOM instead of (only) ResizeObserver on the scroller.
    const mutation = new MutationObserver(onMaybePin);
    mutation.observe(el, {
      childList: true,
      subtree: true,
      characterData: true
    });

    let resize: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resize = new ResizeObserver(onMaybePin);
      resize.observe(el);
      for (const child of Array.from(el.children)) {
        resize.observe(child);
      }
    }

    return () => {
      mutation.disconnect();
      resize?.disconnect();
      clearScheduled();
    };
  }, [clearScheduled, containerRef, threadKey, messageKey, loading, scrollToBottom]);

  return { scrollToBottom };
}

export function supportMessagesKey(
  messages: Array<{ id?: string | number | null }>
): string {
  if (!messages.length) return "0";
  const last = messages[messages.length - 1];
  return `${messages.length}:${String(last?.id ?? "")}`;
}
