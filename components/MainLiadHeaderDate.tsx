import * as React from "react";
import {
  collectScrollTargets,
  maxScrollTop,
  nextCompactState
} from "./user/userScrollCompact";
import {
  dayDigitBoxes,
  pickFirstTodayReminder,
  tehranDateParts
} from "./reminder/reminderHomeModel";
import styles from "./MainLiadHeaderDate.module.css";

type MainLiadHeaderDateProps = {
  reminders?: unknown;
  /** Opens Reminder settings (same action as Plasmic HeaderLiom button2). */
  onSettingsClick?: () => void;
};

const EXPANDED_HEADER_PX = 168;
const COMPACT_PAD_BOTTOM_PX = 10;

function ClockIcon() {
  return (
    <svg
      className={styles.alarmIcon}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 8.2V12l2.6 1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className={styles.settingsIcon}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
    >
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13a7.8 7.8 0 0 0 .05-2l2.05-1.6-2-3.46-2.45.95a7.7 7.7 0 0 0-1.73-1L15 3.5h-6l-.32 2.39a7.7 7.7 0 0 0-1.73 1L4.5 5.94l-2 3.46L4.55 11a7.8 7.8 0 0 0 0 2l-2.05 1.6 2 3.46 2.45-.95a7.7 7.7 0 0 0 1.73 1L9 20.5h6l.32-2.39a7.7 7.7 0 0 0 1.73-1l2.45.95 2-3.46L19.4 13Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Reminder home header: page title + first-today hero card.
 * Compact (scroll): title stays; card fades; header height collapses.
 */
export default function MainLiadHeaderDate({
  reminders,
  onSettingsClick
}: MainLiadHeaderDateProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = React.useState(false);
  const parts = React.useMemo(() => tehranDateParts(), []);
  const digits = React.useMemo(() => dayDigitBoxes(parts.day), [parts.day]);
  const first = React.useMemo(
    () => pickFirstTodayReminder(reminders),
    [reminders]
  );

  const handleSettingsClick = React.useCallback(() => {
    if (!onSettingsClick) return;
    void onSettingsClick();
  }, [onSettingsClick]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    const headerHost = (root.parentElement as HTMLElement | null) || root;
    const pageRoot =
      (headerHost.parentElement as HTMLElement | null) || headerHost;
    headerHost.setAttribute("data-reminder-header", "1");
    headerHost.classList.add(styles.headerHost);

    const toolbar =
      (headerHost.firstElementChild as HTMLElement | null) || null;

    const measuredExpanded = Math.round(
      headerHost.getBoundingClientRect().height || EXPANDED_HEADER_PX
    );
    const expandedPx = Math.max(measuredExpanded, EXPANDED_HEADER_PX);

    const setHeight = (nextCompact: boolean) => {
      const h = nextCompact
        ? (() => {
            const stylesComputed = window.getComputedStyle(headerHost);
            const padTop = Number.parseFloat(stylesComputed.paddingTop) || 0;
            const rowH = toolbar?.getBoundingClientRect().height || 40;
            return Math.max(
              Math.round(rowH + padTop + COMPACT_PAD_BOTTOM_PX),
              52
            );
          })()
        : expandedPx;
      const value = `${h}px`;
      headerHost.style.setProperty("--reminder-header-height", value);
      pageRoot.style.setProperty("--reminder-header-height", value);
      headerHost.style.height = value;
    };

    let isCompact = false;
    setHeight(false);

    const apply = (next: boolean) => {
      if (next === isCompact) return;
      isCompact = next;
      setCompact(next);
      if (next) headerHost.setAttribute("data-reminder-header-compact", "1");
      else headerHost.removeAttribute("data-reminder-header-compact");
      setHeight(next);
    };

    const targets = collectScrollTargets(headerHost);
    const onScroll = () => {
      apply(nextCompactState(isCompact, maxScrollTop(targets)));
    };

    for (const target of targets) {
      target.addEventListener("scroll", onScroll, { passive: true });
    }
    // MainLiad root is the primary scroller under Homepage; ensure it is watched
    // even if overflow styles hydrate after the first paint.
    const pageScroller =
      (pageRoot.closest?.(
        '[class*="PlasmicMainLiad_root"], [class*="PlasmicMainLiad_root__"]'
      ) as HTMLElement | null) ||
      (pageRoot.matches?.(
        '[class*="PlasmicMainLiad_root"], [class*="PlasmicMainLiad_root__"]'
      )
        ? pageRoot
        : null);
    if (pageScroller && !targets.includes(pageScroller)) {
      pageScroller.addEventListener("scroll", onScroll, { passive: true });
      targets.push(pageScroller);
    }
    onScroll();

    return () => {
      for (const target of targets) {
        target.removeEventListener("scroll", onScroll);
      }
      headerHost.removeAttribute("data-reminder-header-compact");
      headerHost.removeAttribute("data-reminder-header");
      headerHost.classList.remove(styles.headerHost);
      headerHost.style.removeProperty("--reminder-header-height");
      headerHost.style.height = "";
      pageRoot.style.removeProperty("--reminder-header-height");
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.wrap}
      data-compact={compact ? "1" : "0"}
      aria-live="polite"
    >
      <div className={styles.titleRow}>
        <div className={styles.pageTitle}>یادآوری‌ها</div>
        {onSettingsClick ? (
          <button
            type="button"
            className={styles.settingsBtn}
            aria-label="ویرایش و تنظیمات"
            onClick={handleSettingsClick}
          >
            <SettingsIcon />
          </button>
        ) : null}
      </div>
      <div className={styles.card} aria-hidden={compact}>
        <div className={styles.mainCol}>
          <div className={styles.digitRow} aria-hidden>
            {digits.map((digit, i) => (
              <span key={`${digit}-${i}`} className={styles.digit}>
                {digit}
              </span>
            ))}
          </div>
          <div className={styles.infoCol}>
            <div className={styles.title}>
              {first?.title || "برای امروز یادآوری نیست"}
            </div>
            {first ? (
              <div className={styles.timeRow}>
                <ClockIcon />
                <span className={styles.time}>{first.timeLabel}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.dateLeft}>{parts.fullShort}</div>
      </div>
    </div>
  );
}
