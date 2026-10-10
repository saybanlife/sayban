import * as React from "react";
import { useRouter } from "next/router";
import { classNames } from "@plasmicapp/react-web";
import { PlasmicHomepage } from "./plasmic/sayban/PlasmicHomepage";
import homepageSty from "./plasmic/sayban/PlasmicHomepage.module.css";
import Home from "./Home";
import HomeSearchInput from "./HomeSearchInput";
import ReservationDetails from "./ReservationDetails";
import ReminderDetailPage from "./ReminderDetailPage";
import Support from "./Support";
import SupportChat from "./SupportChat";
import SupportQuickMenu from "./support/SupportQuickMenu";
import SupportFab from "./support/SupportFab";
import usePageLoading from "./usePageLoading";
import TehranServicesNotice from "./home/TehranServicesNotice";
import embedStyles from "./support/SupportEmbed.module.css";
import chromeStyles from "./HomepageChrome.module.css";
import type { HomeSliderItem } from "./homeSlider/homeSliderTypes";
import { extractReservationIdFromSlug } from "./reservation/reservationDetailsModel";
import { extractReminderIdFromSlug } from "@/lib/reminderTask";
import { goBackOrReplace } from "./navigation/backNavigation";
import {
  extractSupportChatIdFromSlug,
  isSupportLandingSlug
} from "./support/supportTypes";
import { resolveCentersFilterLabel } from "./HomePopularServices";
import Subcategories from "./Subcategories";
import {
  clearCompanionReturn,
  isSameRoute,
  readCompanionReturn,
  rememberCompanionReturn,
  type CompanionDialogHost,
  type CompanionReturn
} from "./companion/companionFlow";
import {
  buildAddAddressDestination,
  clearAddressDialogReturn,
  pathOnly as routePathOnly,
  readAddressDialogReturn,
  rememberAddressDialogReturn
} from "./address/addressDialogFlow";
import {
  resolveHomepageActiveViews,
  type HomepageActiveView
} from "./homepage/activeView";
import FavoritesPage from "./favorites/FavoritesPage";
import { CenterStaffListPage } from "./centerPage/CenterStaffListPage";
import { VisitBookingPage } from "./centerPage/VisitBookingPage";
import {
  extractCenterStaffsIdFromSlug,
  extractVisitBookingIdFromSlug
} from "./centerNavigation";
import {
  activeViewsRequireVerifiedAuth,
  clearInvalidPublicAuth,
  ensureVerifiedPublicAuth,
  hasVerifiedPublicAuth,
  isGuestOnly
} from "@/lib/publicAuthGate";
import { rememberAuthReturn } from "@/lib/guestSession";
import { useHomeScrollStage } from "./home/useHomeScrollStage";
import { ENABLE_HOME_SCROLL_STAGES } from "./home/homeScrollStageConfig";
import { resolveHomeProfileName } from "./home/homeProfile";
import searchStyles from "./HomeSearchInput.module.css";

const hideWhenSupport = { props: { style: { display: "none" } } };

/** TTL for GET /categories/full only (localStorage via ApiRequest cacheKey). */
const CATEGORIES_FULL_CACHE_TTL_MS = 10 * 60 * 1000;

function readSlugParts(slug: string | string[] | undefined): string[] {
  if (Array.isArray(slug)) {
    return slug.map(part => String(part).trim()).filter(Boolean);
  }
  if (typeof slug === "string" && slug.trim()) {
    return [slug.trim()];
  }
  return [];
}

/** Prefer asPath so favorites works before router.query hydrates (avoids Plasmic login redirect). */
function pathIncludesSegment(asPath: string, segment: string): boolean {
  return String(asPath || "")
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean)
    .includes(segment);
}

function Homepage() {
  const router = useRouter();
  const [homeSliders, setHomeSliders] = React.useState<HomeSliderItem[]>([]);
  const [homeCategories, setHomeCategories] = React.useState<unknown[]>([]);
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [categoriesFullReady, setCategoriesFullReady] = React.useState(false);
  const [categoriesFullLoading, setCategoriesFullLoading] = React.useState(false);
  const [supportMenuOpen, setSupportMenuOpen] = React.useState(false);
  const [profileName, setProfileName] = React.useState("");
  const homePageRef = React.useRef<HTMLDivElement | null>(null);
  const homepageRootRef = React.useRef<HTMLDivElement | null>(null);
  const { show: showPageLoading, hide: hidePageLoading } = usePageLoading();
  const fullLoadingVisibleRef = React.useRef(false);
  const profileLoadingVisibleRef = React.useRef(false);

  const [companionReturn, setCompanionReturn] =
    React.useState<CompanionReturn | null>(null);

  const reservationId = React.useMemo(
    () => extractReservationIdFromSlug(router.query.slug as string | string[]),
    [router.query.slug]
  );

  const reminderDetailId = React.useMemo(
    () => extractReminderIdFromSlug(router.query.slug as string | string[]),
    [router.query.slug]
  );

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const slugParts = React.useMemo(
    () => readSlugParts(router.query.slug as string | string[] | undefined),
    [router.query.slug]
  );
  const activeViews = React.useMemo(
    () => resolveHomepageActiveViews(pageBase, slugParts, router.query.status),
    [pageBase, router.query.status, slugParts]
  );
  const isViewActive = React.useCallback(
    (view: HomepageActiveView) => activeViews.has(view),
    [activeViews]
  );
  const renderActiveView = React.useCallback(
    (view: HomepageActiveView) => ({
      render: (renderProps: any, DefaultView: any) =>
        isViewActive(view) ? <DefaultView {...renderProps} /> : null
    }),
    [isViewActive]
  );

  React.useEffect(() => {
    if (!router.isReady) return;
    // `/home` (and other consumer shells except center/favorites) need a valid token.
    const path = String(router.asPath || "").split(/[?#]/)[0];
    if (pathIncludesSegment(path, "center") || pathIncludesSegment(path, "favorites")) {
      return;
    }
    if (hasVerifiedPublicAuth()) return;
    clearInvalidPublicAuth();
    rememberAuthReturn(router.asPath);
    void router.replace("/login");
  }, [router, router.isReady, router.asPath]);

  const phonePromptPathRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!router.isReady) return;
    if (!isGuestOnly()) {
      phonePromptPathRef.current = null;
      return;
    }
    if (!activeViewsRequireVerifiedAuth(activeViews)) {
      phonePromptPathRef.current = null;
      return;
    }
    if (phonePromptPathRef.current === router.asPath) return;
    phonePromptPathRef.current = router.asPath;
    ensureVerifiedPublicAuth({
      returnPath: router.asPath,
      message: "برای ادامه این بخش باید شماره موبایل خود را تأیید کنید."
    });
  }, [activeViews, router]);

  // Survives a hard reload while the user is on the AddPatient page.
  React.useEffect(() => {
    setCompanionReturn(current => current ?? readCompanionReturn());
  }, []);

  const startAddCompanion = React.useCallback(
    (host: CompanionDialogHost) => {
      const entry: CompanionReturn = { path: router.asPath, host };
      rememberCompanionReturn(entry);
      setCompanionReturn(entry);
      router.push(`/${pageBase}/addPatient`);
    },
    [router, pageBase]
  );

  /**
   * Set once we are back on the screen that opened AddPatient. Covers both
   * submitting (AddPatient calls addNew) and cancelling (header history back).
   */
  const reopenCompanionHost = React.useMemo(() => {
    if (!companionReturn) return null;
    return isSameRoute(router.asPath, companionReturn.path)
      ? companionReturn.host
      : null;
  }, [companionReturn, router.asPath]);

  const finishAddCompanion = React.useCallback(() => {
    clearCompanionReturn();
    setCompanionReturn(null);
  }, []);

  /**
   * Re-opens the companion picker on the host screen and routes its
   * "افزودن همراه" button into the AddPatient page.
   */
  const companionHostOverride = React.useCallback(
    (host: CompanionDialogHost) => ({
      render: (renderProps: any, DefaultHost: any) => {
        if (host === "visitBooking") return null;
        if (!isViewActive(host === "centerOffers" ? "centerOffers" : host)) {
          return null;
        }
        const reopen = reopenCompanionHost === host;
        return (
          <DefaultHost
            {...renderProps}
            userNew={() => startAddCompanion(host)}
            entryOpendialog={
              reopen ? true : renderProps.entryOpendialog
            }
            userSelectOpendialog={
              reopen ? true : renderProps.userSelectOpendialog
            }
            onUserSelectOpendialogChange={(value: boolean) => {
              if (!value && reopen) finishAddCompanion();
              renderProps.onUserSelectOpendialogChange?.(value);
            }}
          />
        );
      }
    }),
    [reopenCompanionHost, startAddCompanion, finishAddCompanion, isViewActive]
  );

  /** Pathname without query/hash — sync from asPath and window for reliable nesting. */
  const pathOnly = React.useMemo(() => {
    const fromRouter = String(router.asPath || "")
      .split(/[?#]/)[0]
      .replace(/\/+$/, "");
    if (typeof window === "undefined") return fromRouter;
    const fromWindow = String(window.location.pathname || "")
      .replace(/\/+$/, "");
    // Prefer the longer nested path if they disagree during transitions.
    if (fromWindow.length > fromRouter.length) return fromWindow;
    return fromRouter || fromWindow;
  }, [router.asPath]);

  const pathSlugParts = React.useMemo(() => {
    const parts = pathOnly.split("/").filter(Boolean);
    // /{page}/... → drop page segment
    if (parts[0] === pageBase) return parts.slice(1);
    return parts;
  }, [pathOnly, pageBase]);

  const supportChatId = React.useMemo(() => {
    return (
      extractSupportChatIdFromSlug(
        router.query.slug as string | string[] | undefined
      ) || extractSupportChatIdFromSlug(pathSlugParts)
    );
  }, [router.query.slug, pathSlugParts]);

  const isSupport = React.useMemo(() => {
    return (
      isSupportLandingSlug(
        router.query.slug as string | string[] | undefined
      ) || isSupportLandingSlug(pathSlugParts)
    );
  }, [router.query.slug, pathSlugParts]);

  const supportActive = Boolean(supportChatId || isSupport);

  /**
   * Prefer asPath over query.slug so nested routes hide the shared Home chrome
   * immediately on client navigations (query can lag one frame and flash both headers).
   */
  const isNestedHomePath =
    pathOnly !== `/${pageBase}` && pathOnly.startsWith(`/${pageBase}/`);

  const isHomeLanding =
    pageBase === "home" && !supportActive && !isNestedHomePath;

  useHomeScrollStage(
    homepageRootRef,
    ENABLE_HOME_SCROLL_STAGES && isHomeLanding
  );

  const isBookingPage =
    isViewActive("booking") ||
    slugParts.some(part => part.startsWith("reservation_"));

  /** Skip Home categories fetch on booking/reminder shells to cut competing network work. */
  const shouldFetchHomeCategories =
    !supportActive &&
    pageBase === "home" &&
    !isBookingPage &&
    !slugParts.some(
      part =>
        part.startsWith("pay_") ||
        part === "center" ||
        part.startsWith("staff_") ||
        part.startsWith("offer_")
    );

  const handleFullLoading = React.useCallback(
    (loading: boolean) => {
      setCategoriesFullLoading(loading);
      if (loading && !fullLoadingVisibleRef.current) {
        fullLoadingVisibleRef.current = true;
        showPageLoading("در حال دریافت اطلاعات...");
      } else if (!loading && fullLoadingVisibleRef.current) {
        fullLoadingVisibleRef.current = false;
        hidePageLoading();
      }
    },
    [hidePageLoading, showPageLoading]
  );

  React.useEffect(
    () => () => {
      if (fullLoadingVisibleRef.current) {
        fullLoadingVisibleRef.current = false;
        hidePageLoading();
      }
    },
    [hidePageLoading]
  );

  const needsProfileBeforePaint = [
    "user",
    "editUser",
    "patient",
    "address",
    "notif"
  ].some(view => isViewActive(view as HomepageActiveView));

  /** Center profile has its own critical GET; don't race it with /getProfile. */
  const isCenterPage = isViewActive("center");
  const shouldFetchProfile =
    !isBookingPage &&
    !supportActive &&
    !isCenterPage &&
    hasVerifiedPublicAuth();

  const handleProfileLoading = React.useCallback(
    (loading: boolean) => {
      if (!needsProfileBeforePaint) loading = false;
      if (loading && !profileLoadingVisibleRef.current) {
        profileLoadingVisibleRef.current = true;
        showPageLoading("در حال دریافت اطلاعات کاربر...");
      } else if (!loading && profileLoadingVisibleRef.current) {
        profileLoadingVisibleRef.current = false;
        hidePageLoading();
      }
    },
    [hidePageLoading, needsProfileBeforePaint, showPageLoading]
  );
  const centersFilterLabel = React.useMemo(
    () => resolveCentersFilterLabel(homeCategories, slugParts),
    [homeCategories, slugParts]
  );

  React.useEffect(() => {
    if (!shouldFetchHomeCategories || !isHomeLanding) {
      setCategoriesFullReady(false);
      handleFullLoading(false);
    }
  }, [shouldFetchHomeCategories, isHomeLanding, handleFullLoading]);

  const setHomePageRef = React.useCallback((node: HTMLDivElement | null) => {
    homePageRef.current = node;
  }, []);

  const openSupportMenu = React.useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(`.${homepageSty.svg__nuBs}`)) return;
    event.preventDefault();
    event.stopPropagation();
    setSupportMenuOpen(true);
  }, []);

  React.useEffect(() => {
    const onOpenSupportMenu = () => setSupportMenuOpen(true);
    window.addEventListener("sayban:open-support-menu", onOpenSupportMenu);
    return () =>
      window.removeEventListener("sayban:open-support-menu", onOpenSupportMenu);
  }, []);

  React.useEffect(() => {
    const icon = homePageRef.current?.querySelector(
      `.${homepageSty.svg__nuBs}`
    ) as HTMLElement | null;
    if (!icon) return;
    icon.style.cursor = "pointer";
    icon.setAttribute("role", "button");
    icon.setAttribute("aria-label", "پشتیبانی");
    icon.tabIndex = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSupportMenuOpen(true);
      }
    };
    icon.addEventListener("keydown", onKeyDown);
    return () => icon.removeEventListener("keydown", onKeyDown);
  }, [router.asPath]);

  if (reservationId) {
    return (
      <ReservationDetails
        reservationId={reservationId}
        onBack={() => goBackOrReplace(router, "/booking/")}
      />
    );
  }

  // Same early-return pattern as reservation details — not a PlasmicHomepage slot.
  if (reminderDetailId) {
    return (
      <ReminderDetailPage
        reminderId={reminderDetailId}
        onBack={() => goBackOrReplace(router, `/${pageBase}`)}
      />
    );
  }

  // Favorites is not a PlasmicHomepage page slot — render alone so User chrome
  // / auth SideEffect do not sit underneath (same pattern as reservation details).
  // Prefer asPath: catch-all stays statically optimizable (no getServerSideProps),
  // so query.slug can lag on hard loads while asPath already has /favorites.
  const favoritesActive =
    pathIncludesSegment(router.asPath, "favorites") ||
    isViewActive("favorites");
  if (favoritesActive) {
    return <FavoritesPage />;
  }

  const centerStaffsId =
    extractCenterStaffsIdFromSlug(router.query.slug as string | string[]) ||
    (isViewActive("centerStaffs")
      ? extractCenterStaffsIdFromSlug(
          router.asPath.split(/[?#]/)[0].split("/").filter(Boolean)
        )
      : null);
  if (centerStaffsId) {
    return <CenterStaffListPage centerId={centerStaffsId} />;
  }

  const visitBookingId =
    extractVisitBookingIdFromSlug(router.query.slug as string | string[]) ||
    (isViewActive("visitBooking")
      ? extractVisitBookingIdFromSlug(
          router.asPath.split(/[?#]/)[0].split("/").filter(Boolean)
        )
      : null);
  if (visitBookingId) {
    return <VisitBookingPage centerId={visitBookingId} />;
  }

  // Shared fixed Home search chrome (section__pJCrL) stays outside `.homePage`
  // and is only CSS-hidden for booking/reminder — hide it on every nested route.
  const hideSharedHomeHeader = !isHomeLanding;

  return (
    <>
      <PlasmicHomepage
        overrides={{
          root: {
            props: {
              ref: homepageRootRef,
              className: classNames(
                hideSharedHomeHeader && chromeStyles.hideSharedHomeHeader,
                supportActive && chromeStyles.supportMode
              ),
              "data-sayban-home-chrome": isHomeLanding ? "landing" : "nested"
            }
          },
          ...(supportActive
            ? {
                homePage: hideWhenSupport,
                home: hideWhenSupport,
                categories: hideWhenSupport,
                subcategories: hideWhenSupport,
                user: hideWhenSupport,
                mainLiad: hideWhenSupport,
                faQs: hideWhenSupport
              }
            : {
                homePage: {
                  props: {
                    ref: setHomePageRef,
                    onClickCapture: openSupportMenu
                  }
                },
                home: {
                  render: (renderProps: any, DefaultHome: any) =>
                    isViewActive("home") ? (
                      <Home {...renderProps} homeSliders={homeSliders} />
                    ) : null
                }
              }),
          rules: supportActive
            ? {
                props: {
                  className: classNames(
                    "__wab_instance",
                    homepageSty.rules,
                    homepageSty.rulespage_rules,
                    embedStyles.embedVisible
                  )
                },
                render: () =>
                  supportChatId ? (
                    <SupportChat embedded conversationId={supportChatId} />
                  ) : (
                    <Support embedded />
                  )
              }
            : renderActiveView("rules"),
          categories2: {
            render: (renderProps: any, DefaultApiRequest: any) => (
              <DefaultApiRequest
                {...renderProps}
                loadingDisplay={null}
                // Persist categories/full and skip the request while fresh.
                // The key is auth-independent so hydration does not refetch.
                cacheKey="categories-full"
                cacheTtlMs={CATEGORIES_FULL_CACHE_TTL_MS}
                shouldFetch={
                  Boolean(renderProps.shouldFetch !== false) &&
                  shouldFetchHomeCategories
                }
                onLoading={(loading: boolean) => {
                  handleFullLoading(loading);
                  renderProps.onLoading?.(loading);
                }}
                onSuccess={(data: {
                  sliders?: HomeSliderItem[];
                  result?: unknown[];
                }) => {
                  setCategoriesFullReady(true);
                  handleFullLoading(false);
                  if (Array.isArray(data?.sliders)) {
                    setHomeSliders(data.sliders);
                  } else {
                    setHomeSliders([]);
                  }
                  if (Array.isArray(data?.result)) {
                    setHomeCategories(data.result);
                  } else {
                    setHomeCategories([]);
                  }
                  renderProps.onSuccess?.(data);
                }}
              />
            )
          },
          profile: {
            render: (renderProps: any, DefaultApiRequest: any) => (
              <DefaultApiRequest
                {...renderProps}
                loadingDisplay={needsProfileBeforePaint ? null : renderProps.loadingDisplay}
                shouldFetch={
                  Boolean(renderProps.shouldFetch !== false) &&
                  shouldFetchProfile
                }
                onLoading={(loading: boolean) => {
                  handleProfileLoading(loading);
                  renderProps.onLoading?.(loading);
                }}
                onSuccess={(data: any) => {
                  handleProfileLoading(false);
                  setProfileName(resolveHomeProfileName(data));
                  renderProps.onSuccess?.(data);
                }}
                onError={(error: any) => {
                  handleProfileLoading(false);
                  renderProps.onError?.(error);
                }}
              />
            )
          },
          ...(supportActive
            ? {}
            : {
                subcategories: {
                  render: (
                    renderProps: React.ComponentProps<typeof Subcategories>,
                    DefaultSubcategories: typeof Subcategories
                  ) =>
                    isViewActive("subcategories") ? (
                      <DefaultSubcategories
                        {...renderProps}
                        subcategori={
                          centersFilterLabel ||
                          renderProps.subcategori ||
                          undefined
                        }
                      />
                    ) : null
                }
              }),
          textInput: {
            render: (renderProps: any, DefaultTextInput: any) => (
              <HomeSearchInput
                {...renderProps}
                onDebouncedValueChange={setSearchKeyword}
                
              />
            )
          },
          search: {
            render: (renderProps: any, DefaultApiRequest: any) => (
              <DefaultApiRequest
                {...renderProps}
                body={{
                  ...renderProps.body,
                  keyword: searchKeyword.trim()
                }}
                shouldFetch={Boolean(searchKeyword.trim())}
              />
            )
          },
          center: companionHostOverride("center"),
          centerOffers: {
            render: (renderProps: any, DefaultCenterOffers: any) => {
              if (!isViewActive("centerOffers")) return null;
              const reopen = reopenCompanionHost === "centerOffers";
              return (
                <DefaultCenterOffers
                  {...renderProps}
                  addAddress={async () => {
                    rememberAddressDialogReturn(router.asPath);
                    const destination = buildAddAddressDestination(
                      pageBase,
                      router.asPath
                    );
                    await router.push(destination);
                  }}
                  userNew={() => startAddCompanion("centerOffers")}
                  entryOpendialog={
                    reopen ? true : renderProps.entryOpendialog
                  }
                  userSelectOpendialog={
                    reopen ? true : renderProps.userSelectOpendialog
                  }
                  onUserSelectOpendialogChange={(value: boolean) => {
                    if (!value && reopen) finishAddCompanion();
                    renderProps.onUserSelectOpendialogChange?.(value);
                  }}
                />
              );
            }
          },
          staff: companionHostOverride("staff"),
          user: renderActiveView("user"),
          mainLiad: renderActiveView("mainLiad"),
          categories: renderActiveView("categories"),
          booking: {
            render: (renderProps: any, DefaultBooking: any) =>
              isViewActive("booking") ? (
                <DefaultBooking {...renderProps} api />
              ) : null
          },
          payment: renderActiveView("payment"),
          about: renderActiveView("about"),
          faQs: renderActiveView("faQs"),

          editUser: renderActiveView("editUser"),
          notif: renderActiveView("notif"),
          patient: renderActiveView("patient"),
          reminderSetting: renderActiveView("reminderSetting"),
          address: renderActiveView("address"),
          payResult: renderActiveView("payResult"),
          staffs: renderActiveView("staffs"),
          addPatient: {
            render: (renderProps: any, DefaultAddPatient: any) => isViewActive("addPatient") ? (
              <DefaultAddPatient
                {...renderProps}
                addNew={async () => {
                  await renderProps.addNew?.();
                  // Only hijack the navigation when we got here from a picker.
                  if (companionReturn) router.back();
                }}
              />
            ) : null
          },
          addAddress: {
            render: (renderProps: any, DefaultAddAddress: any) => isViewActive("addAddress") ? (
              <DefaultAddAddress
                {...renderProps}
                addNew={async () => {
                  await renderProps.addNew?.();
                  const remembered = readAddressDialogReturn();
                  if (!remembered) return;
                  clearAddressDialogReturn();
                  const target = routePathOnly(remembered.path);
                  if (target && !isSameRoute(router.asPath, target)) {
                    await router.replace(target);
                  }
                }}
              />
            ) : null
          }
        } as Record<string, unknown>}
      />
      {!supportActive ? (
        <>
          <SupportQuickMenu
            open={supportMenuOpen}
            onOpenChange={next => setSupportMenuOpen(Boolean(next))}
            pageBase={pageBase}
          />
          <TehranServicesNotice enabled={isHomeLanding} />
        </>
      ) : null}
    </>
  );
}

export default Homepage;
