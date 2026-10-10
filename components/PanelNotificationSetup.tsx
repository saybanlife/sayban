import * as React from "react";
import { initFcm, requestNotificationPermission } from "@/lib/fcm";
import { resolveNotificationGate } from "@/lib/notificationStatus";
import styles from "./PanelNotificationSetup.module.css";

const PANEL_NOTIF_SNOOZE_KEY = "panelNotificationReminderLater";

/**
 * Compact panel notification status + enable control.
 * Complements the shared NotificationModal prompt in `_app.tsx`.
 */
export default function PanelNotificationSetup() {
  const [gate, setGate] = React.useState(() => resolveNotificationGate());
  const [busy, setBusy] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  const refresh = React.useCallback(() => {
    setGate(resolveNotificationGate());
  }, []);

  React.useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const onVisible = () => refresh();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const snoozeUntil = Number(localStorage.getItem(PANEL_NOTIF_SNOOZE_KEY) || 0);
    if (snoozeUntil && Date.now() < snoozeUntil && gate !== "active") {
      setHidden(true);
    }
  }, [gate]);

  if (hidden || gate === "active" || gate === "not_supported") {
    return null;
  }

  const enable = async () => {
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await initFcm();
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(PANEL_NOTIF_SNOOZE_KEY, String(oneWeek));
    setHidden(true);
  };

  const copy =
    gate === "blocked"
      ? "دسترسی اعلان‌ها در مرورگر مسدود است. از تنظیمات مرورگر فعالش کنید."
      : "برای دریافت اعلان‌های پنل (پیام‌ها و رویدادهای مرکز)، دسترسی اعلان‌ها را فعال کنید.";

  return (
    <div className={styles.bar} role="status">
      <div className={styles.text}>{copy}</div>
      <div className={styles.actions}>
        {gate !== "blocked" ? (
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() => {
              void enable();
            }}
          >
            {busy ? "..." : "فعال‌سازی اعلان‌ها"}
          </button>
        ) : null}
        <button type="button" className={styles.secondary} onClick={later}>
          بعداً
        </button>
      </div>
    </div>
  );
}
