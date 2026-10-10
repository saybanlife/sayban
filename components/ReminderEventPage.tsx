import * as React from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "@/lib/bodyScrollLock";
import styles from "./ReminderEventPage.module.css";

export type ReminderEventPageProps = {
  opendialog?: boolean;
  onOpendialogChange?: (val: boolean | string) => void;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

/**
 * Full-page create/edit reminder shell.
 * Portaled to document.body so it still opens when ReminderSetting is nested
 * under the main Reminder page (MainLiad) — in-tree fixed layers were clipped
 * or buried under parent overflow/z-index.
 * Do NOT forward Plasmic Dialog className (`PlasmicReminderSetting_dialog`) or
 * max-width:100% blows the sheet to full viewport on desktop.
 */
export default function ReminderEventPage({
  opendialog,
  onOpendialogChange,
  children
}: ReminderEventPageProps) {
  const open = Boolean(opendialog);
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      onOpendialogChange?.(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpendialogChange]);

  React.useEffect(() => {
    if (open) pageRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={pageRef}
      tabIndex={-1}
      role="region"
      aria-label="فرم یادآوری"
      data-reminder-event-page="1"
      className={styles.page}
    >
      <div className={styles.inner}>{children}</div>
    </div>,
    document.body
  );
}
