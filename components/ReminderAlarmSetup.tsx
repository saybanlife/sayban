import * as React from "react";
import {
  isSaybanNativeAndroid,
  openNativeExactAlarmSettings,
  readNativeAlarmStatus,
  shouldShowExactAlarmControl,
  type NativeAlarmStatus
} from "@/lib/nativeShell";
import Switchbest from "./Switchbest";
import styles from "./ReminderAlarmSetup.module.css";

function statusLabel(status: NativeAlarmStatus | null): string {
  if (!status) return "در حال خواندن وضعیت…";
  if (!status.supported) return "فعال (این نسخه اندروید نیاز به مجوز جدا ندارد)";
  return status.enabled ? "فعال" : "غیرفعال";
}

/**
 * Native-Android-only آلارم row for Reminder Settings.
 * Always visible in the Android shell; hidden in browser/PWA.
 * Toggle opens system exact-alarm settings; status syncs on resume/focus.
 */
export default function ReminderAlarmSetup() {
  const [native, setNative] = React.useState(false);
  const [status, setStatus] = React.useState<NativeAlarmStatus | null>(null);
  const [pending, setPending] = React.useState(false);

  const refresh = React.useCallback(() => {
    const isNative = isSaybanNativeAndroid();
    setNative(isNative);
    setStatus(isNative ? readNativeAlarmStatus() : null);
    setPending(false);
  }, []);

  React.useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const onVisible = () => refresh();
    const onAlarm = () => refresh();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("sayban-alarm-status", onAlarm as EventListener);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 1500);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(
        "sayban-alarm-status",
        onAlarm as EventListener
      );
      window.clearInterval(poll);
    };
  }, [refresh]);

  if (!shouldShowExactAlarmControl(native, status)) {
    return null;
  }

  const checked = Boolean(status?.enabled);
  const canToggle = Boolean(status?.supported);
  const label = statusLabel(status);

  return (
    <div className={styles.bar} role="group" aria-label="آلارم">
      <div className={styles.copy}>
        <div className={styles.title}>آلارم</div>
        <div className={styles.text}>
          وضعیت: {label}
          {canToggle
            ? " — برای تغییر، سوییچ را بزنید و در تنظیمات اندروید تأیید کنید."
            : null}
        </div>
      </div>
      <div className={styles.actions}>
        <Switchbest
          noLabel
          isDisabled={!canToggle || pending}
          isChecked={checked}
          onChange={(next: boolean) => {
            if (!canToggle) return;
            // Optimistic UI until OS settings return; resume/focus re-syncs.
            setPending(true);
            setStatus(prev => {
              if (!prev) return prev;
              return {
                supported: prev.supported,
                enabled: next,
                permission: next ? "granted" : "denied"
              };
            });
            openNativeExactAlarmSettings();
            window.setTimeout(refresh, 1200);
          }}
        />
      </div>
    </div>
  );
}
