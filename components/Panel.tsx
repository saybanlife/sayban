import * as React from "react";
import { useRouter } from "next/router";
import { PlasmicPanel } from "./plasmic/sayban/PlasmicPanel";
import usePageLoading from "./usePageLoading";
import PanelNotificationSetup from "./PanelNotificationSetup";
import { initFcm } from "@/lib/fcm";
import {
  centerIdFromPanelPage,
  panelMenuSelectionForPage
} from "@/lib/panelCenterNavigation";
import {
  firstPanelPageSegment,
  mainPageFromPanelSegment
} from "@/lib/panelRouteParams";
import { usePanelLocation } from "@/lib/usePanelLocation";
import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import {
  filterPanelMenuForNurseStaffing,
  shouldShowStaffsMenu
} from "./panel/nurseStaffingAccess";

type PanelProfile = {
  role?: string | null;
  care_domain?: string | null;
  center_id?: number | string | null;
};

function readProfileResult(data: unknown): PanelProfile | null {
  if (!data || typeof data !== "object") return null;
  const root = data as { result?: unknown };
  const result =
    root.result && typeof root.result === "object"
      ? (root.result as Record<string, unknown>)
      : (data as Record<string, unknown>);
  if (!result || typeof result !== "object") return null;
  return {
    role: result.role != null ? String(result.role) : null,
    care_domain:
      result.care_domain != null ? String(result.care_domain) : null,
    center_id:
      result.center_id != null && result.center_id !== ""
        ? (result.center_id as number | string)
        : null
  };
}

async function fetchCenterCareDomain(
  centerId: string | number
): Promise<string | null> {
  const token = readCookie(PANEL_AUTH_COOKIE_NAME);
  if (!token) return null;
  try {
    const res = await fetch(
      resolveApiUrl(
        `${PANEL_ROUTES.center}?id=${encodeURIComponent(String(centerId))}`
      ),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      result?: { care_domain?: unknown };
      care_domain?: unknown;
    };
    const raw = data?.result?.care_domain ?? data?.care_domain;
    return raw != null && String(raw).trim() ? String(raw).trim() : null;
  } catch {
    return null;
  }
}

function Panel() {
  const router = useRouter();
  const asPath = usePanelLocation();
  const { show, hide } = usePageLoading();
  const loadingVisible = React.useRef(false);
  const [profile, setProfile] = React.useState<PanelProfile | null>(null);

  const clearProfileLoading = React.useCallback(() => {
    if (!loadingVisible.current) return;
    loadingVisible.current = false;
    hide();
  }, [hide]);

  const handleProfileLoading = React.useCallback(
    (loading: boolean) => {
      if (loading && !loadingVisible.current) {
        loadingVisible.current = true;
        show("در حال دریافت اطلاعات پنل...");
      } else if (!loading) {
        clearProfileLoading();
      }
    },
    [clearProfileLoading, show]
  );

  // Catch-all /panel/[[...page]] never unmounts Panel on tab switches or soft
  // nav to login — force-clear the profile overlay when auth pages show or the
  // route segment changes so a abandoned fetch cannot stick forever.
  React.useEffect(() => {
    const page = firstPanelPageSegment(router.query.page, asPath);
    if (page === "login" || page === "create") {
      clearProfileLoading();
      setProfile(null);
    }
  }, [asPath, router.query.page, clearProfileLoading]);

  React.useEffect(
    () => () => {
      clearProfileLoading();
    },
    [clearProfileLoading]
  );

  // Re-bind FCM to panelToken after panel shell mounts (home may have used public token).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Native Android: _app already inits once; audience switch still needs panelToken upload.
    void (async () => {
      const { isSaybanNativeAndroid } = await import("@/lib/nativeShell");
      if (isSaybanNativeAndroid()) {
        void initFcm();
        return;
      }
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") {
        void initFcm();
      }
    })();
  }, []);

  // Load real centers.care_domain for center_admin (profile JWT has no domain).
  React.useEffect(() => {
    if (!profile?.role || profile.role !== "center_admin") return;
    if (profile.care_domain != null) return;
    if (profile.center_id == null || profile.center_id === "") return;
    let cancelled = false;
    void (async () => {
      const careDomain = await fetchCenterCareDomain(profile.center_id!);
      if (cancelled) return;
      // Empty string marks "loaded, not nursing" so the menu can settle.
      setProfile(current =>
        current
          ? { ...current, care_domain: careDomain ?? "" }
          : current
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.role, profile?.center_id, profile?.care_domain]);

  const pageSegment = firstPanelPageSegment(router.query.page, asPath);
  const menuSelection = panelMenuSelectionForPage(pageSegment);
  const mainPage = mainPageFromPanelSegment(pageSegment);
  const staffsAllowed = shouldShowStaffsMenu({
    role: profile?.role,
    careDomain: profile?.care_domain
  });
  const careDomainReady =
    profile?.role !== "center_admin" ||
    profile?.care_domain != null ||
    profile?.center_id == null;

  // Deep-link guard: elderly-only center admins must not stay on /panel/staffs.
  React.useEffect(() => {
    if (!profile?.role) return;
    if (!careDomainReady) return;
    if (pageSegment !== "staffs") return;
    if (staffsAllowed) return;
    void router.replace("/panel/dashboard");
  }, [profile, pageSegment, staffsAllowed, careDomainReady, router]);

  return (
    <>
      <PanelNotificationSetup />
      <PlasmicPanel
        overrides={{
          apiRequest: {
            render: (renderProps: any, DefaultApiRequest: any) => (
              <DefaultApiRequest
                {...renderProps}
                loadingDisplay={null}
                onLoading={(loading: boolean) => {
                  handleProfileLoading(loading);
                  renderProps.onLoading?.(loading);
                }}
                onSuccess={(data: any) => {
                  handleProfileLoading(false);
                  const next = readProfileResult(data);
                  if (next) setProfile(next);
                  renderProps.onSuccess?.(data);
                }}
                onError={(error: any) => {
                  handleProfileLoading(false);
                  renderProps.onError?.(error);
                }}
              />
            )
          },
          panelMenu: {
            render: (renderProps: any, Comp: any) => (
              <Comp
                {...renderProps}
                menu={
                  careDomainReady
                    ? filterPanelMenuForNurseStaffing(renderProps.menu, {
                        role: profile?.role,
                        careDomain: profile?.care_domain
                      })
                    : renderProps.menu
                }
                selecteItem={menuSelection}
              />
            )
          },
          loginPanel: {
            render: (renderProps: any, Comp: any) => (
              <Comp
                {...renderProps}
                key={pageSegment || "login"}
                page={pageSegment || renderProps.page}
              />
            )
          },
          main: {
            render: (renderProps: any, Comp: any) => {
              const fromRoute = centerIdFromPanelPage(
                pageSegment,
                router.query.id
              );
              // Prefer the route id for `/panel/center-{id}`. Plasmic's split on
              // "-" can mis-parse other segments; center_info is excluded.
              const centerId =
                fromRoute ??
                (renderProps.centerId != null && renderProps.centerId !== ""
                  ? renderProps.centerId
                  : null);
              const pageForMain =
                careDomainReady &&
                profile?.role &&
                pageSegment === "staffs" &&
                !staffsAllowed
                  ? "dashboard"
                  : mainPage || undefined;
              return (
                <Comp
                  {...renderProps}
                  key={pageSegment || "dashboard"}
                  page={pageForMain}
                  centerId={centerId}
                />
              );
            }
          }
        }}
      />
    </>
  );
}

export default Panel;
