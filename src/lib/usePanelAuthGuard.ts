/**
 * Client-side auth guard for /panel/* routes.
 *
 * The panel had no guard of any kind — no middleware, no getServerSideProps,
 * and the one generated `onMount` check compared the token state against `null`
 * while it is initialized to `""`, so it never fired. That let a logged-out user
 * reach the panel with Back or by typing a panel URL.
 *
 * Returns false while the session is being resolved or a redirect is pending,
 * so the caller can avoid rendering panel content to an unauthenticated user.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { PANEL_LOGIN_PATH, hasPanelSession } from "./panelSession";
import { firstPanelPageSegment, panelAppHref } from "./panelRouteParams";
import { usePanelLocation } from "./usePanelLocation";

/** Sub-routes of /panel that are reachable without a session. */
const PUBLIC_PANEL_PAGES = new Set(["login", "create"]);

export function usePanelAuthGuard(): boolean {
  const router = useRouter();
  const asPath = usePanelLocation();
  const [allowed, setAllowed] = useState(false);

  const page = firstPanelPageSegment(router.query.page, asPath);
  const isPublicPage = PUBLIC_PANEL_PAGES.has(page);

  useEffect(() => {
    if (!router.isReady) return;

    const check = () => {
      if (isPublicPage || hasPanelSession()) {
        setAllowed(true);
        return;
      }
      setAllowed(false);
      // `replace` so the guarded URL does not linger in the history stack.
      router.replace(panelAppHref(PANEL_LOGIN_PATH));
    };

    check();

    // A page restored from the back/forward cache does not remount, so the
    // effect above would not re-run — re-check on restore.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) check();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router, router.isReady, isPublicPage, page]);

  return allowed;
}
