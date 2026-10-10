import * as React from "react";

import { useRouter } from "next/router";

import { classNames, HTMLElementRefOf } from "@plasmicapp/react-web";

import { DefaultMenu2Props } from "./plasmic/sayban/PlasmicMenu2";

import IconMenu from "./IconMenu";

import styles from "./Menu2.module.css";

export interface Menu2Props extends DefaultMenu2Props {}

const MENU_ITEMS = [
  { key: "reminder", label: "یادآوری" },
  { key: "home", label: "خانه" },
  { key: "user", label: "کاربر" },
] as const;

type MenuKey = (typeof MENU_ITEMS)[number]["key"];

const MENU_KEY_SET = new Set<string>(MENU_ITEMS.map((item) => item.key));

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
    raw === "booking" ||
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

function Menu2_(
  props: Menu2Props,
  ref: HTMLElementRefOf<"div">
) {
  const router = useRouter();

  const pageParam =
    typeof router.query.page === "string"
      ? router.query.page
      : undefined;

  // Active tab comes only from the URL — ignore stale Plasmic `select` state.
  const activeKey = resolveActiveKey(pageParam);

  const activeIndex = MENU_ITEMS.findIndex(
    (item) => item.key === activeKey
  );

  const itemsRef = React.useRef<HTMLDivElement>(null);

  const itemRefs = React.useRef<
    Array<HTMLButtonElement | null>
  >([]);

  const [indicatorLeft, setIndicatorLeft] =
    React.useState<string>("50%");

  const updateIndicator = React.useCallback(() => {
    const container = itemsRef.current;
    const activeBtn = itemRefs.current[activeIndex];

    if (!container || !activeBtn) return;

    const containerRect =
      container.getBoundingClientRect();

    const iconWrap = activeBtn.querySelector(
      `[data-menu-icon="true"]`
    ) as HTMLElement | null;

    // Indicator remains aligned with the icon, not the label.
    const target = iconWrap ?? activeBtn;

    const targetRect = target.getBoundingClientRect();

    const center =
      targetRect.left +
      targetRect.width / 2 -
      containerRect.left;

    setIndicatorLeft(`${center}px`);
  }, [activeIndex]);

  React.useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, activeKey, router.asPath]);

  React.useEffect(() => {
    const container = itemsRef.current;

    if (!container) return;

    const onResize = () => {
      updateIndicator();
    };

    window.addEventListener("resize", onResize);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;

    ro?.observe(container);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [updateIndicator]);

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
        <div
          className={styles.bar}
          aria-hidden="true"
        />

        <div
          className={styles.cutout}
          style={{ left: indicatorLeft }}
          aria-hidden="true"
        />

        <div
          className={styles.indicator}
          style={{ left: indicatorLeft }}
          aria-hidden="true"
        />

        <div
          className={styles.items}
          role="list"
          ref={itemsRef}
        >
          {MENU_ITEMS.map((item, index) => {
            const active = item.key === activeKey;

            return (
              <button
                key={item.key}
                type="button"
                role="listitem"
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className={classNames(
                  styles.item,
                  active
                    ? styles.itemActive
                    : undefined
                )}
                aria-label={item.label}
                aria-current={
                  active ? "page" : undefined
                }
                onClick={() => navigate(item.key)}
              >
                {/* Icon */}
                <span
                  className={styles.iconWrap}
                  data-menu-icon="true"
                >
                  <IconMenu
                    className={styles.iconMenu}
                    currentItem={item}
                    icons={item.key}
                  />
                </span>

                {/* Label */}
                <span className={styles.label}>
                  {item.label}
                </span>
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