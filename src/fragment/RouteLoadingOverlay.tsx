import * as React from "react";
import { useRouter } from "next/router";
import PageLoadingOverlay from "./PageLoadingOverlay";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 250;
/** Hard stop so a hung routeChange never leaves the panel on Loading forever. */
const MAX_VISIBLE_MS = 12000;

/** Uses the shared Sayban full-page loader for meaningful route transitions. */
export function RouteLoadingOverlay() {
  const router = useRouter();
  const [visible, setVisible] = React.useState(false);
  const showTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const maxTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const shownAt = React.useRef(0);

  React.useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
    };
    const start = () => {
      clearTimers();
      showTimer.current = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
        maxTimer.current = setTimeout(() => setVisible(false), MAX_VISIBLE_MS);
      }, SHOW_DELAY_MS);
    };
    const finish = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
      const elapsed = shownAt.current ? Date.now() - shownAt.current : MIN_VISIBLE_MS;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimer.current = setTimeout(() => setVisible(false), remaining);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", finish);
    router.events.on("routeChangeError", finish);
    return () => {
      clearTimers();
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", finish);
      router.events.off("routeChangeError", finish);
    };
  }, [router.events]);

  return visible ? <PageLoadingOverlay message="در حال بارگذاری صفحه..." /> : null;
}

export default RouteLoadingOverlay;