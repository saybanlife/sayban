import * as React from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "@/lib/bodyScrollLock";
import styles from "./ReminderEventPage.module.css";

export type ReminderEventPageProps = {
  opendialog?: boolean;
  onOpendialogChange?: (val: boolean | string) => void;
  step?: number;
  /** Phone Back / history pop while on step 1 — stay open, return to step 0. */
  onStepBack?: () => void;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

type EventHistoryState = {
  saybanReminderEvent?: boolean;
  step?: number;
};

function isEventState(state: unknown): state is EventHistoryState {
  return Boolean(
    state &&
      typeof state === "object" &&
      (state as EventHistoryState).saybanReminderEvent
  );
}

function eventHistoryDepth(state: unknown): number {
  if (!isEventState(state)) return 0;
  const step = Number(state.step) || 0;
  if (step >= 2) return 3;
  if (step >= 1) return 2;
  return 1;
}

function markFooter(root: HTMLElement | null, hasPrev: boolean) {
  if (!root) return;
  const footer = root.querySelector(
    '[class*="freeBox__reDfY"], [class*="freeBox__r6Nu"]'
  ) as HTMLElement | null;
  if (!footer) return;
  footer.setAttribute("data-reminder-footer", "1");
  footer.setAttribute("data-has-prev", hasPrev ? "1" : "0");
  const cta = footer.querySelector(
    '[data-plasmic-name="button14"], [data-plasmic-name="button17"], [data-plasmic-name="button8"], [class*="button14"], [class*="button17"], [class*="button8"]'
  ) as HTMLElement | null;
  if (cta) cta.setAttribute("data-reminder-primary-cta", "1");
}

/**
 * Full-page create/edit reminder shell — mock-aligned wizard chrome.
 * Does not move Plasmic DOM nodes (avoids crushed CTAs); «قبلی» is CSS-placed.
 */
export default function ReminderEventPage({
  opendialog,
  onOpendialogChange,
  step = 0,
  onStepBack,
  children
}: ReminderEventPageProps) {
  const open = Boolean(opendialog);
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const stepRef = React.useRef(step);
  const prevStepRef = React.useRef(step);
  const skipPopRef = React.useRef(false);
  const closedViaPopRef = React.useRef(false);
  const wasOpenRef = React.useRef(false);
  const onStepBackRef = React.useRef(onStepBack);
  const onOpenChangeRef = React.useRef(onOpendialogChange);

  stepRef.current = step;
  onStepBackRef.current = onStepBack;
  onOpenChangeRef.current = onOpendialogChange;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      prevStepRef.current = 0;
      return;
    }
    history.pushState({ saybanReminderEvent: true, step: 0 }, "");
    prevStepRef.current = 0;

    const onPop = () => {
      if (skipPopRef.current) {
        skipPopRef.current = false;
        return;
      }
      if (stepRef.current >= 1) {
        onStepBackRef.current?.();
        return;
      }
      closedViaPopRef.current = true;
      onOpenChangeRef.current?.(false);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (step === prev) return;

    if (step > prev) {
      history.pushState({ saybanReminderEvent: true, step }, "");
      return;
    }
    if (
      step < prev &&
      isEventState(history.state) &&
      Number(history.state.step) > step
    ) {
      skipPopRef.current = true;
      history.back();
    }
  }, [step, open]);

  React.useEffect(() => {
    if (wasOpenRef.current && !open) {
      if (closedViaPopRef.current) {
        closedViaPopRef.current = false;
      } else {
        const depth = eventHistoryDepth(history.state);
        if (depth > 0) {
          skipPopRef.current = true;
          history.go(-depth);
        }
      }
    }
    wasOpenRef.current = open;
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (stepRef.current >= 1) {
        onStepBackRef.current?.();
        return;
      }
      const depth = eventHistoryDepth(history.state);
      if (depth > 0) {
        skipPopRef.current = true;
        history.go(-depth);
      }
      closedViaPopRef.current = true;
      onOpenChangeRef.current?.(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  React.useEffect(() => {
    if (open) pageRef.current?.focus({ preventScroll: true });
  }, [open]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.documentElement.setAttribute("data-reminder-event-open", "1");
    } else {
      document.documentElement.removeAttribute("data-reminder-event-open");
    }
    return () => {
      document.documentElement.removeAttribute("data-reminder-event-open");
    };
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open) return;
    const sync = () => markFooter(pageRef.current, step >= 1);
    sync();
    const mo = new MutationObserver(sync);
    if (pageRef.current) {
      mo.observe(pageRef.current, { childList: true, subtree: true });
    }
    const t = window.setInterval(sync, 400);
    return () => {
      mo.disconnect();
      window.clearInterval(t);
    };
  }, [open, step]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
html[data-reminder-event-open="1"] [class*="PlasmicReminderCategory"],
html[data-reminder-event-open="1"] [class*="ReminderCategory_root"],
html[data-reminder-event-open="1"] [class*="PlasmicReminderCategory_freeBox___7YezZ"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
html[data-reminder-event-open="1"] [data-radix-portal],
html[data-reminder-event-open="1"] .pl__fixed.pl__z-50 {
  z-index: 400 !important;
}
html[data-reminder-event-open="1"]:has([data-radix-portal] [data-state="open"]) [data-reminder-event-page] [data-reminder-footer],
html[data-reminder-event-open="1"]:has([data-radix-portal] [data-state="open"]) [data-reminder-event-page] [data-reminder-prev],
html[data-reminder-event-open="1"]:has(.pl__fixed.pl__z-50[data-state="open"]) [data-reminder-event-page] [data-reminder-footer],
html[data-reminder-event-open="1"]:has(.pl__fixed.pl__z-50[data-state="open"]) [data-reminder-event-page] [data-reminder-prev] {
  visibility: hidden !important;
  pointer-events: none !important;
}
html[data-reminder-event-open="1"] [data-radix-portal] button {
  min-height: 3rem;
}
`,
        }}
      />
      <div
        ref={pageRef}
        tabIndex={-1}
        role="region"
        aria-label="فرم یادآوری"
        data-reminder-event-page="1"
        data-reminder-event-step={String(step)}
        className={styles.page}
      >
        <div className={styles.inner}>{children}</div>
        {step >= 1 ? (
          <button
            type="button"
            className={styles.prevBtn}
            data-reminder-prev="1"
            onClick={() => onStepBack?.()}
          >
            قبلی
          </button>
        ) : null}
      </div>
    </>,
    document.body
  );
}
