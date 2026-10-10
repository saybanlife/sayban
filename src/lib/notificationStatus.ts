import {
  getNativePushBridge,
  isSaybanNativeAndroid,
  readNativeNotificationStatus
} from "@/lib/nativeShell";
import { initFcm } from "@/lib/fcm";
import {
  asNotificationPreference,
  saveNotificationPreference
} from "../../components/user/notificationPreference";

export type NotificationGate =
  | "active"
  | "not_asked"
  | "blocked"
  | "not_supported";

/** Switch ON only when OS permission is granted and profile isnotif is on. */
export function isNotificationSwitchOn(userinfoIsnotif: unknown): boolean {
  if (isSaybanNativeAndroid()) {
    const native = readNativeNotificationStatus();
    if (!native?.enabled) return false;
    return asNotificationPreference(userinfoIsnotif);
  }
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (window.Notification.permission !== "granted") return false;
  return asNotificationPreference(userinfoIsnotif);
}

export function resolveNotificationGate(): NotificationGate {
  if (isSaybanNativeAndroid()) {
    const native = readNativeNotificationStatus();
    if (!native) return "not_supported";
    if (native.enabled || native.permission === "granted") return "active";
    if (native.permission === "denied") return "blocked";
    return "not_asked";
  }
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "not_supported";
  }
  const permission = window.Notification.permission;
  if (permission === "granted") return "active";
  if (permission === "denied") return "blocked";
  return "not_asked";
}

/** After OS permission is available: refresh/register native FCM and sync profile. */
export async function enableNotificationsWithFcm(): Promise<boolean> {
  const token = await initFcm();
  if (isSaybanNativeAndroid()) {
    const bridge = getNativePushBridge();
    try {
      bridge?.registerPushToken?.();
    } catch (error) {
      console.warn("native registerPushToken failed", error);
    }
    const native = readNativeNotificationStatus();
    return Boolean(native?.enabled && (token || native.hasToken));
  }
  return Boolean(token) || Notification.permission === "granted";
}

export async function requestNativeNotificationPermission(): Promise<void> {
  const bridge = getNativePushBridge();
  if (!bridge?.requestNotificationPermission) {
    throw new Error("Native notification bridge unavailable");
  }
  bridge.requestNotificationPermission();
}

export function openNativeNotificationSettings(): void {
  getNativePushBridge()?.openNotificationSettings?.();
}

/**
 * Toggle profile preference when OS permission is already granted.
 * Enabling also forces a native/web FCM token refresh.
 */
export async function toggleActiveNotificationPreference(
  userinfo: { isnotif?: unknown } | null | undefined
): Promise<boolean> {
  const currentlyOn = asNotificationPreference(userinfo?.isnotif);
  const next = !currentlyOn;
  await saveNotificationPreference(next);
  if (userinfo) {
    userinfo.isnotif = next ? 1 : 0;
  }
  if (next) {
    await enableNotificationsWithFcm();
  }
  return next;
}
