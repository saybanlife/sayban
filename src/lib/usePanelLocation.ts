import * as React from "react";
import { useRouter } from "next/router";
import { readPanelHref } from "./panelRouteParams";

type Listener = () => void;

const listeners = new Set<Listener>();
let patched = false;
let origPush: History["pushState"] | undefined;
let origReplace: History["replaceState"] | undefined;

function emit() {
  listeners.forEach(fn => fn());
}

function ensureHistoryPatch() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  origPush = window.history.pushState.bind(window.history);
  origReplace = window.history.replaceState.bind(window.history);
  window.history.pushState = ((data, unused, url) => {
    const result = origPush!(data, unused, url);
    emit();
    return result;
  }) as History["pushState"];
  window.history.replaceState = ((data, unused, url) => {
    const result = origReplace!(data, unused, url);
    emit();
    return result;
  }) as History["replaceState"];
  window.addEventListener("popstate", emit);
}

/**
 * Live panel URL. Next.js catch-all can change `history` (and the address bar)
 * on Back/`replace` without updating `router.asPath`, so Plasmic keeps the old
 * page. Read `window.location` after every history write.
 */
export function usePanelLocation(): string {
  const router = useRouter();
  const read = React.useCallback(
    () =>
      readPanelHref(
        router.asPath,
        typeof window === "undefined" ? undefined : window.location.pathname,
        typeof window === "undefined" ? undefined : window.location.search
      ),
    [router.asPath]
  );
  const [href, setHref] = React.useState(() =>
    readPanelHref(router.asPath)
  );

  React.useEffect(() => {
    const sync = () => {
      const next = read();
      setHref(current => (current === next ? current : next));
    };
    ensureHistoryPatch();
    listeners.add(sync);
    router.events.on("routeChangeComplete", sync);
    router.events.on("routeChangeError", sync);
    router.events.on("hashChangeComplete", sync);
    sync();
    return () => {
      listeners.delete(sync);
      router.events.off("routeChangeComplete", sync);
      router.events.off("routeChangeError", sync);
      router.events.off("hashChangeComplete", sync);
    };
  }, [read, router.events]);

  return href;
}
