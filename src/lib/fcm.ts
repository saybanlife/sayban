import { firebaseApp } from "./firebase";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const initFcm = async () => {
  if (!("serviceWorker" in navigator)) return;
  if (!("Notification" in window)) return;

  if (!(await isSupported())) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const messaging = getMessaging(firebaseApp);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg
  });

  console.log("FCM token:", token);

  onMessage(messaging, (payload) => {
    console.log("Foreground message:", payload);
  });
};
