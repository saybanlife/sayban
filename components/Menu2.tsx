import * as React from "react";
import { useRouter } from "next/router";
import { classNames, HTMLElementRefOf } from "@plasmicapp/react-web";
import { DefaultMenu2Props } from "./plasmic/sayban/PlasmicMenu2";
import IconMenu from "./IconMenu";
import {
  countActiveBookings,
  formatBookingBadgeCount
} from "./reservation/bookingTabs";
import { PUBLIC_ROUTES, resolveApiUrl } from "../src/lib/apiRoutes";
import { resolvePublicAuthToken } from "../src/lib/publicAuthToken";
import { readCookie } from "../src/lib/authCookies";
import styles from "./Menu2.module.css";

export interface Menu2Props extends DefaultMenu2Props {}

const MENU_ITEMS = [
  { key: "home", label: "خانه" },
  { key: "booking", label: "درخواست‌ها" },
  { key: "reminder", label: "یادآوری" },
  { key: "user", label: "کاربر" }
] as const;

type MenuKey = (typeof MENU_ITEMS)[number]["key"];

const MENU_KEY_SET = new Set<string>(MENU_ITEMS.map(item => item.key));

/** Badge refresh — avoid competing with Booking/Home Reservation polls. */
const BOOKING_BADGE_POLL_MS = 60000;

/**
 * Resolve exactly one footer tab from the route page segment.
 * Never match by prefix / substring so similar paths cannot activate two items.
 */
function resolveActiveKey(page: string | undefined): MenuKey {
  const raw = String(page || "home").trim().toLowerCase();

  if (MENU_KEY_SET.has(raw)) {
    return raw as MenuKey;
  }

  // Nested consumer flows that still live under the home shell
  if (
    raw === "categories" ||
    raw === "subcategories" ||
    raw === "center" ||
    raw === "payment" ||
    raw === "about" ||
    raw === "faq" ||
    raw === "rules"
  ) {
    return "home";
  }

  return "home";
}

async function fetchActiveBookingCount(): Promise<number> {
  const token = resolvePublicAuthToken(readCookie("token"));
  if (!token) return 0;
  const response = await fetch(resolveApiUrl(PUBLIC_ROUTES.reservation), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });
  if (!response.ok) return 0;
  const payload = await response.json().catch(() => null);
  return countActiveBookings(payload);
}

function Menu2_(props: Menu2Props, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  const [activeBookingCount, setActiveBookingCount] = React.useState(0);

  const pageParam =
    typeof router.query.page === "string" ? router.query.page : undefined;

  // Active tab comes only from the URL — ignore stale Plasmic `select` state.
  const activeKey = resolveActiveKey(pageParam);

  const refreshActiveCount = React.useCallback(async () => {
    try {
      setActiveBookingCount(await fetchActiveBookingCount());
    } catch {
      setActiveBookingCount(0);
    }
  }, []);

  React.useEffect(() => {
    void refreshActiveCount();
    // On the booking page the list already soft-polls /Reservation; skip the
    // footer interval there to cut duplicate traffic. Still refresh on focus
    // and route changes everywhere.
    const shouldIntervalPoll = activeKey !== "booking";
    const timer = shouldIntervalPoll
      ? window.setInterval(() => {
          void refreshActiveCount();
        }, BOOKING_BADGE_POLL_MS)
      : 0;
    const onFocus = () => {
      void refreshActiveCount();
    };
    window.addEventListener("focus", onFocus);
    router.events.on("routeChangeComplete", refreshActiveCount);
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      router.events.off("routeChangeComplete", refreshActiveCount);
    };
  }, [activeKey, refreshActiveCount, router.events]);

  const navigate = React.useCallback(
    (key: MenuKey) => {
      if (key === activeKey) return;

      // Update Plasmic state for compatibility;
      // visual active follows the route only.
      props.onSelectChange?.(key);

      void router.push(`/${key}/`);
    },
    [activeKey, props, router]
  );

  return (
    <nav
      ref={ref}
      className={classNames(styles.root, props.className)}
      aria-label="منوی اصلی"
    >
      <div className={styles.shell}>
        <div className={styles.items} role="list">
          {MENU_ITEMS.map(item => {
            const active = item.key === activeKey;
            const showBadge =
              item.key === "booking" && activeBookingCount > 0;
            const badgeText = formatBookingBadgeCount(activeBookingCount);

            return (
              <button
                key={item.key}
                type="button"
                role="listitem"
                className={classNames(
                  styles.item,
                  active ? styles.itemActive : undefined
                )}
                aria-label={
                  showBadge
                    ? `${item.label}، ${badgeText} فعال`
                    : item.label
                }
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.key)}
              >
                <span className={styles.iconWrap} data-menu-icon="true">
                  <IconMenu
                    className={styles.iconMenu}
                    currentItem={item}
                    icons={item.key}
                    select={active}
                  />
                  {showBadge ? (
                    <span className={styles.badge} aria-hidden>
                      {badgeText}
                    </span>
                  ) : null}
                </span>

                <span className={styles.label}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

const Menu2 = React.forwardRef(Menu2_);

export default Menu2;
