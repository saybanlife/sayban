import * as React from "react";
import { classNames, HTMLElementRefOf } from "@plasmicapp/react-web";
import { PlasmicMain, DefaultMainProps } from "./plasmic/sayban/PlasmicMain";
import MainPageHomeSlider from "./MainPageHomeSlider";
import MainPageTags from "./MainPageTags";
import MainPageNotifications from "./MainPageNotifications";
import MainPageSendNotif from "./MainPageSendNotif";
import MainPageSupport from "./MainPageSupport";
import MainPageReviews from "./MainPageReviews";
import CenterRegistrationReview from "./centerPanel/CenterRegistrationReview";
import styles from "./MainHomeElements.module.css";
import tagStyles from "./MainPageTags.module.css";

export interface MainProps extends Omit<DefaultMainProps, "page"> {
  page?:
    | DefaultMainProps["page"]
    | "home_elements"
    | "home_slider"
    | "tags"
    | "notifications"
    | "send_notif"
    | "support"
    | "reviews"
    | string;
}

function isHomeSliderPage(page: MainProps["page"]) {
  return page === "home_elements" || page === "home_slider";
}

function isTagsPage(page: MainProps["page"]) {
  return page === "tags";
}

function parseCenterInfoId(page: MainProps["page"]): string | null {
  const raw = String(page ?? "");
  const match = /^center_info-(\d+)$/.exec(raw);
  return match ? match[1] : null;
}

/**
 * Support and the home-slider editor are platform-staff tools. Hiding the menu
 * entry is not enough: a center admin could still open `/panel/support`
 * directly. The matching server guard is in
 * `src/pages/api/panel/support/[...path].ts`.
 */
function isSuperAdmin(role: unknown) {
  return String(role ?? "") === "super_admin";
}

/**
 * Custom pages are layers inside the Plasmic root, so they used to mount (and
 * fetch) on every Panel page. Mount on first activation instead, then keep them
 * mounted so switching back stays instant.
 */
function useActivatedOnce(active: boolean) {
  const [activated, setActivated] = React.useState(active);
  React.useEffect(() => {
    if (active) setActivated(true);
  }, [active]);
  return activated || active;
}

function Main_(props: MainProps, ref: HTMLElementRefOf<"div">) {
  const staffOnly = isSuperAdmin(props.role);
  const centerInfoId = parseCenterInfoId(props.page);
  const showHomeSlider = isHomeSliderPage(props.page) && staffOnly;
  const isTagsRoute = isTagsPage(props.page);
  const showTags = isTagsRoute && staffOnly;
  const showTagsDenied = isTagsRoute && !staffOnly;
  const showSendNotif = props.page === "send_notif" && staffOnly;
  const showNotifications = props.page === "notifications";
  const showSupport = props.page === "support" && staffOnly;
  const showReviews =
    props.page === "reviews" && props.role === "center_admin";
  const showCenterInfo = Boolean(centerInfoId) && staffOnly;
  const customPage =
    showHomeSlider ||
    showTags ||
    showTagsDenied ||
    showNotifications ||
    showSendNotif ||
    showSupport ||
    showReviews ||
    showCenterInfo;

  const homeSliderMounted = useActivatedOnce(showHomeSlider);
  const tagsMounted = useActivatedOnce(showTags);
  const tagsDeniedMounted = useActivatedOnce(showTagsDenied);
  const notificationsMounted = useActivatedOnce(showNotifications);
  const sendNotifMounted = useActivatedOnce(showSendNotif);
  const supportMounted = useActivatedOnce(showSupport);
  const reviewsMounted = useActivatedOnce(showReviews);
  const centerInfoMounted = useActivatedOnce(showCenterInfo);

  // Custom pages are not Plasmic variants — leave `page` unset so other
  // MainPage* slots stay hidden; TopPage still renders from PlasmicMain.
  const plasmicPage = customPage
    ? undefined
    : (props.page as DefaultMainProps["page"]);

  // Catch-all never unmounts Main. Plasmic's private `page` variant only
  // inits once, so a URL change would keep the previous CSS-visible page
  // unless this tree remounts for the new segment.
  const plasmicTreeKey = customPage
    ? `custom:${String(props.page ?? "")}`
    : String(plasmicPage || "dashboard");

  return (
    <PlasmicMain
      key={plasmicTreeKey}
      {...(props as DefaultMainProps)}
      page={plasmicPage}
      overrides={{
        root: {
          props: { ref },
          render: (rootProps: any, Root: any) => {
            const { children, className, ...rest } = rootProps;
            return (
              <Root
                {...rest}
                className={classNames(
                  className,
                  customPage ? styles.mainRootFill : undefined
                )}
              >
                {children}
                {homeSliderMounted ? (
                  <MainPageHomeSlider
                    className={classNames(
                      styles.pageLayer,
                      showHomeSlider && styles.pageLayerActive
                    )}
                    token={props.token}
                  />
                ) : null}
                {tagsMounted ? (
                  <MainPageTags
                    className={classNames(
                      styles.pageLayer,
                      showTags && styles.pageLayerActive
                    )}
                    token={props.token}
                  />
                ) : null}
                {tagsDeniedMounted ? (
                  <div
                    className={classNames(
                      styles.pageLayer,
                      showTagsDenied && styles.pageLayerActive,
                      tagStyles.accessDenied
                    )}
                    role="status"
                  >
                    <p className={tagStyles.accessDeniedTitle}>
                      دسترسی محدود
                    </p>
                    <p className={tagStyles.accessDeniedBody}>
                      مدیریت تگ‌ها فقط برای مدیر سامانه (Super Admin) فعال است.
                    </p>
                  </div>
                ) : null}
                {notificationsMounted ? (
                  <MainPageNotifications
                    className={classNames(
                      styles.pageLayer,
                      showNotifications && styles.pageLayerActive
                    )}
                    token={props.token}
                  />
                ) : null}
                {sendNotifMounted ? (
                  <MainPageSendNotif
                    className={classNames(
                      styles.pageLayer,
                      showSendNotif && styles.pageLayerActive
                    )}
                    token={props.token}
                  />
                ) : null}
                {supportMounted ? (
                  <MainPageSupport
                    className={classNames(
                      styles.pageLayer,
                      showSupport && styles.pageLayerActive
                    )}
                    token={props.token}
                  />
                ) : null}
                {reviewsMounted ? (
                  <MainPageReviews
                    className={classNames(
                      styles.pageLayer,
                      showReviews && styles.pageLayerActive
                    )}
                    token={props.token}
                  />
                ) : null}
                {centerInfoMounted ? (
                  <CenterRegistrationReview
                    className={classNames(
                      styles.pageLayer,
                      showCenterInfo && styles.pageLayerActive
                    )}
                    centerId={centerInfoId}
                    token={props.token}
                  />
                ) : null}
              </Root>
            );
          }
        }
      }}
    />
  );
}

const Main = React.forwardRef(Main_);
export default Main;
