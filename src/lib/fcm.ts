import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { firebaseApp } from "./firebase";

const VAPID_KEY =
  "BDroVn6KRs9iN1laogFt-J47xc9WsWIfblgIBCi2QllonFT-PAu9up26gRlL-9uL7R1FSllN7I13eTR6IZiH72g";

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    const value = rest.join("=");

    if (key === name) {
      try {
        return JSON.parse(decodeURIComponent(value))[0];
      } catch {
        return decodeURIComponent(value);
      }
    }
  }

  return null;
};

const sendTokenToServer = async (token: string) => {
  const authToken = getCookie("token");

  if (!authToken) {
    console.warn("[FCM] Auth token not found. Token was not sent to server.");
    return;
  }

  try {
    const res = await fetch("https://n8n.staas.ir/webhook/rest/user/setFcm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
      },
      body: JSON.stringify({
        fcm: token,
      }),
    });

    if (!res.ok) {
      throw new Error(`FCM token send failed. Status: ${res.status}`);
    }

    localStorage.setItem("fcmToken", token);
    console.log("[FCM] Token sent and saved successfully.");
  } catch (err) {
    console.error("[FCM] Error sending token to server:", err);
  }
};

export const initFcm = async () => {
  if (typeof window === "undefined") return;

  if (!("serviceWorker" in navigator)) {
    console.warn("[FCM] Service Worker is not supported.");
    return;
  }

  if (!("Notification" in window)) {
    console.warn("[FCM] Notification API is not supported.");
    return;
  }

  const supported = await isSupported();

  if (!supported) {
    console.warn("[FCM] Firebase Messaging is not supported in this browser.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("[FCM] Notification permission was not granted.");
      return;
    }

    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const messaging = getMessaging(firebaseApp);

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!currentToken) {
      console.warn("[FCM] No registration token available.");
      return;
    }

    console.log("[FCM] Token:", currentToken);

    const oldToken = localStorage.getItem("fcmToken");

    if (oldToken !== currentToken) {
      await sendTokenToServer(currentToken);
    } else {
      console.log("[FCM] Token already exists in localStorage.");
    }

    onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message:", payload);
    });
  } catch (err) {
    console.error("[FCM] init error:", err);
  }
};
