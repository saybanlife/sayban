import { firebaseApp } from "./firebase";
import type { Messaging } from "firebase/messaging";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import {
  PANEL_AUTH_COOKIE_NAME,
  PUBLIC_AUTH_COOKIE_NAME,
  readCookie
} from "./authCookies";
import { PANEL_ROUTES, PUBLIC_ROUTES, resolveApiUrl } from "./apiRoutes";
import {
  getNativePushBridge,
  isSaybanNativeAndroid,
  readNativeNotificationStatus
} from "./nativeShell";

const VAPID_KEY =
  "BB5iK65gAz1q5PnKQDv_6wqV-dXMMpNg4E6iaAZje7kLM1Nrxb_NPkw2HFDo7Y-FJKiq8nlov7RZsvtkGeGEIj0";

const MESSAGING_SW_URL = "/firebase-messaging-sw.js";
const MESSAGING_SW_SCOPE = "/firebase-cloud-messaging-push-scope";
const SW_ACTIVATION_TIMEOUT_MS = 15000;

type FcmAudience = "public" | "panel";

type AuthUploadContext = {
  audience: FcmAudience;
  authToken: string;
  endpoint: string;
};

let fcmInitPromise: Promise<string | null> | null = null;
let foregroundListenerAttached = false;
let lastUploadKey = "";

export function isPanelAppPath(pathname = ""): boolean {
  const path = pathname.split("?")[0] || "";
  if (!path.startsWith("/panel")) return false;
  if (
    path.startsWith("/panel/login") ||
    path.startsWith("/panel/create") ||
    path.startsWith("/panel/plasmic-host")
  ) {
    return false;
  }
  return true;
}

/**
 * Prefer panel JWT on panel routes so staff tokens land on panel__users.
 * Elsewhere use the public consumer cookie (users.fcmToken).
 */
export function resolveFcmUploadContext(
  pathname = typeof window !== "undefined" ? window.location.pathname : ""
): AuthUploadContext | null {
  const onPanel = isPanelAppPath(pathname);
  if (onPanel) {
    const panelToken = readCookie(PANEL_AUTH_COOKIE_NAME);
    if (panelToken) {
      return {
        audience: "panel",
        authToken: panelToken,
        endpoint: resolveApiUrl(PANEL_ROUTES.setFcmToken)
      };
    }
    return null;
  }

  const publicToken = readCookie(PUBLIC_AUTH_COOKIE_NAME);
  if (publicToken) {
    return {
      audience: "public",
      authToken: publicToken,
      endpoint: resolveApiUrl(PUBLIC_ROUTES.setFcmToken)
    };
  }
  return null;
}

const waitForActiveWorker = (
  registration: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> =>
  new Promise((resolve, reject) => {
    if (registration.active) {
      resolve(registration);
      return;
    }

    const pending = registration.installing || registration.waiting;
    if (!pending) {
      reject(new Error("Service worker registration has no worker to activate."));
      return;
    }

    const timeoutId = setTimeout(() => {
      pending.removeEventListener("statechange", onStateChange);
      reject(
        new Error("Timed out waiting for the messaging service worker to activate.")
      );
    }, SW_ACTIVATION_TIMEOUT_MS);

    function onStateChange() {
      if (pending!.state === "activated") {
        clearTimeout(timeoutId);
        pending!.removeEventListener("statechange", onStateChange);
        resolve(registration);
      } else if (pending!.state === "redundant") {
        clearTimeout(timeoutId);
        pending!.removeEventListener("statechange", onStateChange);
        reject(
          new Error("Messaging service worker became redundant before activating.")
        );
      }
    }

    pending.addEventListener("statechange", onStateChange);
  });

const ensureMessagingServiceWorker =
  async (): Promise<ServiceWorkerRegistration> => {
    const existing = await navigator.serviceWorker.getRegistration(
      MESSAGING_SW_SCOPE
    );

    const registration =
      existing ??
      (await navigator.serviceWorker.register(MESSAGING_SW_URL, {
        scope: MESSAGING_SW_SCOPE
      }));

    return waitForActiveWorker(registration);
  };

const removeLegacyRootRegistration = async (): Promise<void> => {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter(
          registration =>
            registration.scope !==
              new URL(MESSAGING_SW_SCOPE, location.origin).href &&
            [
              registration.active,
              registration.waiting,
              registration.installing
            ].some(worker => worker?.scriptURL.endsWith(MESSAGING_SW_URL))
        )
        .map(registration => registration.unregister())
    );
  } catch (error) {
    console.warn("Could not clean up legacy messaging service worker:", error);
  }
};

const waitMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function uploadKey(ctx: AuthUploadContext | null): string {
  if (!ctx) return "";
  return `${ctx.audience}:${ctx.authToken.slice(0, 24)}`;
}

/**
 * Initializes FCM for the current audience (public home or panel staff),
 * uploads the token with the matching auth cookie, and attaches a foreground
 * notification listener once per page lifetime.
 */
export const initFcm = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  const ctx = resolveFcmUploadContext();
  const key = uploadKey(ctx);
  if (key !== lastUploadKey) {
    fcmInitPromise = null;
    lastUploadKey = key;
  }

  if (isSaybanNativeAndroid()) {
    if (!fcmInitPromise) {
      fcmInitPromise = initNativeFcm().catch(error => {
        fcmInitPromise = null;
        throw error;
      });
    }
    try {
      return await fcmInitPromise;
    } catch (error) {
      console.error("Error initializing native FCM:", error);
      return null;
    }
  }

  if (!("serviceWorker" in navigator)) return null;
  if (!("Notification" in window)) return null;

  if (Notification.permission !== "granted") {
    console.log(
      "Notification permission is not granted. Skipping FCM token initialization."
    );
    return null;
  }

  if (!ctx) {
    console.warn(
      "No matching auth cookie for FCM upload on this route. Skipping token send."
    );
    // Still allow local token + foreground listener so OS display works after grant.
  }

  if (!fcmInitPromise) {
    fcmInitPromise = runFcmInit().catch(error => {
      fcmInitPromise = null;
      throw error;
    });
  }

  try {
    return await fcmInitPromise;
  } catch (error) {
    console.error("Error initializing Firebase Messaging:", error);
    return null;
  }
};

const initNativeFcm = async (): Promise<string | null> => {
  const bridge = getNativePushBridge();
  if (!bridge) {
    console.warn("Sayban native bridge missing; cannot init FCM");
    return null;
  }

  const readToken = (): string => {
    const status = readNativeNotificationStatus();
    return (
      (typeof bridge.getFcmToken === "function" ? bridge.getFcmToken() : "") ||
      status?.fcmToken ||
      window.__SAYBAN_NATIVE__?.fcmToken ||
      ""
    );
  };

  // Prefer cached native token — avoid forcing Firebase re-fetch on every call.
  let token = readToken();
  if (!token) {
    try {
      bridge.registerPushToken?.();
    } catch (error) {
      console.warn("native registerPushToken failed", error);
    }
    for (let i = 0; i < 20; i++) {
      token = readToken();
      if (token) break;
      await waitMs(250);
    }
  }

  if (!token) {
    console.warn("Native FCM token not available yet");
    return null;
  }

  await sendTokenToServer(token, "android");
  return token;
};

const runFcmInit = async (): Promise<string | null> => {
  try {
    if (!(await isSupported())) {
      console.error("Firebase Messaging is not supported in this browser.");
      return null;
    }

    if (Notification.permission !== "granted") {
      console.log(
        "Notification permission is not granted. Skipping FCM token initialization."
      );
      return null;
    }

    await removeLegacyRootRegistration();
    const swRegistration = await ensureMessagingServiceWorker();
    const messaging = getMessaging(firebaseApp);
    const fcmToken = await getTokenWithRetry(messaging, swRegistration);

    if (fcmToken) {
      console.log("FCM Token obtained:", fcmToken);
      await sendTokenToServer(fcmToken);
    } else {
      console.log("Could not obtain FCM token.");
      return null;
    }

    if (!foregroundListenerAttached) {
      foregroundListenerAttached = true;
      onMessage(messaging, payload => {
        console.log("Foreground message received:", payload);
        const notificationTitle = payload.notification?.title || "پیام جدید";
        const notificationOptions = {
          body: payload.notification?.body,
          icon: "/icon-192x192.png"
        };
        if (Notification.permission === "granted") {
          new Notification(notificationTitle, notificationOptions);
        }
      });
    }

    return fcmToken;
  } catch (error) {
    console.error("Error initializing Firebase Messaging:", error);
    return null;
  }
};

const getTokenWithRetry = async (
  messaging: Messaging,
  registration: ServiceWorkerRegistration
): Promise<string> => {
  try {
    return await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
  } catch (error) {
    const isNoActiveWorker =
      error instanceof DOMException && error.name === "AbortError";
    if (!isNoActiveWorker) throw error;

    console.warn(
      "Push subscription failed without an active service worker. Re-registering and retrying."
    );
    await registration.unregister();
    const freshRegistration = await ensureMessagingServiceWorker();

    return getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: freshRegistration
    });
  }
};

const sendTokenToServer = async (
  fcmToken: string,
  platform: "web" | "android" = "web"
) => {
  const ctx = resolveFcmUploadContext();
  if (!ctx) {
    console.warn(
      "Cannot send FCM token: missing panelToken (on /panel) or token (public)."
    );
    return;
  }

  try {
    const response = await fetch(ctx.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.authToken}`
      },
      body: JSON.stringify({
        token: fcmToken,
        platform,
        audience: ctx.audience,
        ...(platform === "android" ? { client: "native" } : {})
      })
    });

    if (response.ok) {
      console.log(
        `FCM token sent (${ctx.audience}) with Bearer authentication.`
      );
    } else {
      console.error(
        `Failed to send FCM token (${ctx.audience}). Status: ${response.status}`
      );
      try {
        const errorData = await response.json();
        console.error("Server error details:", errorData);
      } catch {
        console.error("Could not parse error response JSON.");
      }
    }
  } catch (error) {
    console.error("Network error sending FCM token to server:", error);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  if (isSaybanNativeAndroid()) {
    const bridge = getNativePushBridge();
    const before = readNativeNotificationStatus();
    try {
      bridge?.requestNotificationPermission?.();
    } catch (error) {
      console.error("Error requesting native notification permission:", error);
      return false;
    }
    for (let i = 0; i < 40; i++) {
      await waitMs(250);
      const status = readNativeNotificationStatus();
      if (status?.enabled) return true;
      if (
        i > 8 &&
        status &&
        status.permission === before?.permission &&
        !status.enabled
      ) {
        // keep waiting for the system dialog
      }
    }
    return Boolean(readNativeNotificationStatus()?.enabled);
  }

  if (!("Notification" in window)) {
    console.error("Notifications are not supported in this browser.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("Notification permission requested:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};
