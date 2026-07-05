import { firebaseApp } from "./firebase";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

// کلید VAPID تولید شده در کنسول فایربیس را اینجا بگذارید:
const VAPID_KEY = "BB5iK65gAz1q5PnKQDv_6wqV-dXMMpNg4E6iaAZje7kLM1Nrxb_NPkw2HFDo7Y-FJKiq8nlov7RZsvtkGeGEIj0";

export const initFcm = async () => {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!("Notification" in window)) return;

  try {
    if (!(await isSupported())) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return;
    }

    // ثبت اختصاصی سرویس‌ورکر فایربیس بدون تداخل با next-pwa
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const messaging = getMessaging(firebaseApp);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg
    });

    console.log("FCM Token:", token);

    // برای تست و ارسال به بک‌اند، توکن را ذخیره یا ارسال کنید
    // sendTokenToYourServer(token);

    // مدیریت نوتیفیکیشن‌ها زمانی که کاربر در داخل برنامه است (Foreground)
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      new Notification(payload.notification?.title || "پیام جدید", {
        body: payload.notification?.body,
        icon: "/icon-192x192.png"
      });
    });
  } catch (error) {
    console.error("Error initializing FCM:", error);
  }
};
