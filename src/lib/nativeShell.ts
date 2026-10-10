/**
 * Detect Sayban Android WebView shell and its JavascriptInterface bridge.
 * Browser / PWA paths must remain unchanged when these return null/false.
 */

export type NativePushBridge = {
  getFcmToken?: () => string;
  registerPushToken?: () => void;
  areNotificationsEnabled?: () => boolean;
  getNotificationStatus?: () => string;
  requestNotificationPermission?: () => void;
  openNotificationSettings?: () => void;
  isNative?: () => boolean;
  /** Android 12+ exact-alarm (لیاد / Reminder). */
  canScheduleExactAlarms?: () => boolean;
  areExactAlarmsEnabled?: () => boolean;
  getAlarmStatus?: () => string;
  requestExactAlarmPermission?: () => void;
  openExactAlarmSettings?: () => void;
};

export type SaybanNativeFlag = {
  platform?: string;
  client?: string;
  fcmToken?: string;
  market?: string;
  store?: string;
  role?: string;
  exactAlarmEnabled?: boolean;
  exactAlarm?: Partial<NativeAlarmStatus> | string;
};

declare global {
  interface Window {
    __SAYBAN_NATIVE__?: SaybanNativeFlag;
    SaybanAndroid?: NativePushBridge;
  }
}

export function isSaybanNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const flag = window.__SAYBAN_NATIVE__;
  if (flag?.client === "native" || flag?.platform === "android") {
    return true;
  }
  const bridge = getNativePushBridge();
  try {
    return bridge?.isNative?.() === true;
  } catch {
    return false;
  }
}

export function getNativePushBridge(): NativePushBridge | null {
  if (typeof window === "undefined") return null;
  return window.SaybanAndroid || null;
}

export type NativeNotificationStatus = {
  permission: "granted" | "denied" | "default";
  enabled: boolean;
  fcmToken: string;
  hasToken: boolean;
};

export type NativeAlarmStatus = {
  /** False on API < 31 — exact-alarm special access not applicable. */
  supported: boolean;
  /** True when the app may schedule exact alarms. */
  enabled: boolean;
  permission: "granted" | "denied" | "unsupported";
};

/**
 * True when Reminder Settings should show the آلارم row.
 * Always on Sayban native Android; never in browser/PWA.
 */
export function shouldShowExactAlarmControl(
  isNative: boolean,
  status: NativeAlarmStatus | null | undefined
): boolean {
  if (!isNative) return false;
  // Prefer live status; if bridge not yet ready, still show the row on native.
  return true;
}

/** @deprecated Use shouldShowExactAlarmControl — kept for older imports. */
export function shouldShowExactAlarmEnableCta(
  status: NativeAlarmStatus | null | undefined
): boolean {
  return shouldShowExactAlarmControl(Boolean(status), status);
}

export function openNativeExactAlarmSettings(): void {
  requestNativeExactAlarmPermission();
}

export function readNativeAlarmStatus(): NativeAlarmStatus | null {
  if (!isSaybanNativeAndroid()) return null;
  const bridge = getNativePushBridge();
  try {
    if (bridge && typeof bridge.getAlarmStatus === "function") {
      const raw = bridge.getAlarmStatus();
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NativeAlarmStatus>;
        const permission =
          parsed.permission === "granted" ||
          parsed.permission === "denied" ||
          parsed.permission === "unsupported"
            ? parsed.permission
            : parsed.enabled
              ? "granted"
              : "denied";
        const supported =
          typeof parsed.supported === "boolean"
            ? parsed.supported
            : permission !== "unsupported";
        const enabled = Boolean(parsed.enabled);
        return {
          supported,
          enabled,
          permission: supported ? permission : "unsupported"
        };
      }
    }
    if (bridge && typeof bridge.canScheduleExactAlarms === "function") {
      const enabled = Boolean(bridge.canScheduleExactAlarms());
      return {
        supported: true,
        enabled,
        permission: enabled ? "granted" : "denied"
      };
    }
    if (bridge && typeof bridge.areExactAlarmsEnabled === "function") {
      const enabled = Boolean(bridge.areExactAlarmsEnabled());
      return {
        supported: true,
        enabled,
        permission: enabled ? "granted" : "denied"
      };
    }
    const flag = window.__SAYBAN_NATIVE__;
    if (flag && typeof flag.exactAlarmEnabled === "boolean") {
      return {
        supported: true,
        enabled: flag.exactAlarmEnabled,
        permission: flag.exactAlarmEnabled ? "granted" : "denied"
      };
    }
  } catch (error) {
    console.warn("native alarm status failed", error);
  }
  return null;
}

export function requestNativeExactAlarmPermission(): void {
  const bridge = getNativePushBridge();
  try {
    if (bridge?.requestExactAlarmPermission) {
      bridge.requestExactAlarmPermission();
      return;
    }
    bridge?.openExactAlarmSettings?.();
  } catch (error) {
    console.warn("native exact alarm request failed", error);
  }
}

export function readNativeNotificationStatus(): NativeNotificationStatus | null {
  const bridge = getNativePushBridge();
  if (!bridge) return null;
  try {
    if (typeof bridge.getNotificationStatus === "function") {
      const raw = bridge.getNotificationStatus();
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NativeNotificationStatus>;
        const permission =
          parsed.permission === "granted" ||
          parsed.permission === "denied" ||
          parsed.permission === "default"
            ? parsed.permission
            : "default";
        const fcmToken =
          typeof parsed.fcmToken === "string" ? parsed.fcmToken : "";
        return {
          permission,
          enabled: Boolean(parsed.enabled),
          fcmToken,
          hasToken: Boolean(parsed.hasToken ?? fcmToken)
        };
      }
    }
    const enabled =
      typeof bridge.areNotificationsEnabled === "function"
        ? Boolean(bridge.areNotificationsEnabled())
        : false;
    const fcmToken =
      typeof bridge.getFcmToken === "function"
        ? String(bridge.getFcmToken() || "")
        : "";
    return {
      permission: enabled ? "granted" : "default",
      enabled,
      fcmToken,
      hasToken: Boolean(fcmToken)
    };
  } catch (error) {
    console.warn("native notification status failed", error);
    return null;
  }
}
