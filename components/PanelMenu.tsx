import * as React from "react";
import { useRouter } from "next/router";
import { classNames, HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  PlasmicPanelMenu,
  DefaultPanelMenuProps
} from "./plasmic/sayban/PlasmicPanelMenu";
import styles from "./panel/PanelSidebar.module.css";
import {
  PANEL_NAV_SET_EVENT,
  PANEL_NAV_TOGGLE_EVENT,
  resolveSidebarMode,
  writeStoredSidebarMode,
  type SidebarMode
} from "./panel/panelSidebarMode";
import { withPanelMenuIcon } from "./panel/panelMenuIcons";

export interface PanelMenuProps extends DefaultPanelMenuProps {}

function readPageFromRouter(router: ReturnType<typeof useRouter>): string {
  const page = router.query.page;
  if (Array.isArray(page) && page[0]) return String(page[0]);
  if (typeof page === "string" && page) return page;
  return "dashboard";
}

function syncPanelNavAttr(mode: SidebarMode | null) {
  if (typeof document === "undefined") return;
  if (!mode) {
    delete document.documentElement.dataset.panelNav;
    return;
  }
  document.documentElement.dataset.panelNav =
    mode === "expanded" ? "open" : "closed";
}

function PanelMenu_(props: PanelMenuProps, ref: HTMLElementRefOf<"div">) {
  const { className, menu, ...rest } = props;
  const router = useRouter();
  const pageKey = readPageFromRouter(router);

  // Start collapsed until client hydrate resolves the real mode — avoids a
  // mobile full-screen ::before backdrop covering buttons on first paint.
  const [mode, setMode] = React.useState<SidebarMode>("collapsed");
  const [hoverExpand, setHoverExpand] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  const normalizedMenu = React.useMemo(() => {
    if (!Array.isArray(menu)) return menu;
    return menu.map(item => withPanelMenuIcon(item));
  }, [menu]);

  React.useEffect(() => {
    const next = resolveSidebarMode(pageKey);
    setMode(next);
    setHoverExpand(false);
    setHydrated(true);
    syncPanelNavAttr(next);
  }, [pageKey]);

  React.useEffect(() => {
    if (!hydrated) return;
    syncPanelNavAttr(mode);
  }, [mode, hydrated]);

  React.useEffect(() => {
    return () => {
      syncPanelNavAttr(null);
    };
  }, []);

  React.useEffect(() => {
    const onToggle = () => {
      setMode(current => {
        const next: SidebarMode =
          current === "collapsed" ? "expanded" : "collapsed";
        writeStoredSidebarMode(next);
        return next;
      });
      setHoverExpand(false);
    };
    const onSet = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: SidebarMode }>).detail;
      if (detail?.mode !== "expanded" && detail?.mode !== "collapsed") return;
      writeStoredSidebarMode(detail.mode);
      setMode(detail.mode);
      setHoverExpand(false);
    };
    const onBackdrop = (event: MouseEvent) => {
      if (typeof document === "undefined") return;
      if (document.documentElement.dataset.panelNav !== "open") return;
      if (!window.matchMedia("(max-width: 640px)").matches) return;
      const target = event.target as Node | null;
      const aside = document.querySelector("aside[data-sidebar-mode]");
      if (aside && target && aside.contains(target)) return;
      // clicks on the ::before overlay land on html/body
      if (
        target === document.documentElement ||
        target === document.body ||
        (target instanceof Element && target.id === "__next")
      ) {
        writeStoredSidebarMode("collapsed");
        setMode("collapsed");
        setHoverExpand(false);
      }
    };
    window.addEventListener(PANEL_NAV_TOGGLE_EVENT, onToggle);
    window.addEventListener(PANEL_NAV_SET_EVENT, onSet as EventListener);
    document.addEventListener("click", onBackdrop, true);
    return () => {
      window.removeEventListener(PANEL_NAV_TOGGLE_EVENT, onToggle);
      window.removeEventListener(PANEL_NAV_SET_EVENT, onSet as EventListener);
      document.removeEventListener("click", onBackdrop, true);
    };
  }, []);

  // Close drawer after route change on small screens
  React.useEffect(() => {
    const closeIfMobile = () => {
      if (typeof window === "undefined") return;
      if (!window.matchMedia("(max-width: 640px)").matches) return;
      setMode("collapsed");
      writeStoredSidebarMode("collapsed");
      setHoverExpand(false);
    };
    router.events.on("routeChangeComplete", closeIfMobile);
    return () => router.events.off("routeChangeComplete", closeIfMobile);
  }, [router.events]);

  const collapsed = mode === "collapsed";
  const showExpanded = !collapsed || hoverExpand;

  const toggle = React.useCallback(() => {
    setMode(current => {
      const next: SidebarMode =
        current === "collapsed" ? "expanded" : "collapsed";
      writeStoredSidebarMode(next);
      return next;
    });
    setHoverExpand(false);
  }, []);

  return (
    <aside
      ref={ref as React.Ref<HTMLElement>}
      className={classNames(
        styles.shell,
        className,
        hydrated && collapsed && styles.shellCollapsed,
        hydrated && collapsed && hoverExpand && styles.shellHoverExpand
      )}
      data-sidebar-mode={mode}
      data-sidebar-hover={hoverExpand ? "1" : "0"}
      onMouseEnter={() => {
        if (collapsed && typeof window !== "undefined") {
          if (window.matchMedia("(max-width: 640px)").matches) return;
          setHoverExpand(true);
        }
      }}
      onMouseLeave={() => setHoverExpand(false)}
    >
      <div className={styles.menuHost}>
        <PlasmicPanelMenu
          {...rest}
          menu={normalizedMenu}
          root={{
            style: { height: "100%", minHeight: 0 }
          }}
        />
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.toggleBtn}
          aria-pressed={collapsed}
          aria-label={collapsed ? "باز کردن منو" : "بستن منو"}
          title={collapsed ? "باز کردن منو" : "بستن منو"}
          onClick={toggle}
        >
          <svg
            className={styles.toggleIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {showExpanded ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
          <span className={styles.toggleLabel}>
            {collapsed ? "باز کردن منو" : "بستن منو"}
          </span>
        </button>
      </div>
    </aside>
  );
}

const PanelMenu = React.forwardRef(PanelMenu_);
export default PanelMenu;
