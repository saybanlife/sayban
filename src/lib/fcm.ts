import { firebaseApp } from "./firebase"; // مطمئن شو این مسیر درست است
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

// کلید VAPID تولید شده در کنسول فایربیس را اینجا بگذارید:
const VAPID_KEY = "BB5iK65gAz1q5PnKQDv_6wqV-dXMMpNg4E6iaAZje7kLM1Nrxb_NPkw2HFDo7Y-FJKiq8nlov7RZsvtkGeGEIj0";

/**
 * Firebase Cloud Messaging را مقداردهی اولیه می‌کند.
 * این تابع فرض می‌کند که اجازه نوتیفیکیشن قبلاً توسط کاربر داده شده است.
 * اگر اجازه داده نشده باشد، کاری انجام نمی‌دهد.
 * مسئولیت گرفتن اجازه از کاربر بر عهده caller (مانند _app.tsx) است.
 * @returns {Promise<string | null>} توکن FCM در صورت موفقیت، یا null در صورت خطا یا عدم وجود اجازه.
 */
export const initFcm = async () => {
  // فقط در سمت کلاینت و در مرورگرهای پشتیبانی شده اجرا شود
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  if (!("Notification" in window)) return null;

  try {
    // بررسی پشتیبانی از APIهای لازم
    if (!(await isSupported())) {
      console.error("Firebase Messaging is not supported in this browser.");
      return null;
    }

    // **مهم:** در این نسخه، ما دیگر Notification.requestPermission() را اینجا صدا نمی‌زنیم.
    // این تابع فقط زمانی اجرا می‌شود که کاربر قبلاً اجازه داده باشد ('granted').
    if (Notification.permission !== "granted") {
      console.log("Notification permission is not granted. Skipping FCM token initialization and foreground message handling.");
      // اگر اجازه 'default' یا 'denied' باشد، کاری انجام نمی‌دهیم.
      return null;
    }

    // ثبت Service Worker اختصاصی فایربیس
    // اطمینان حاصل کنید که مسیر '/firebase-messaging-sw.js' درست است
    const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("Firebase Service Worker registered.");

    const messaging = getMessaging(firebaseApp);

    // گرفتن توکن FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log("FCM Token obtained:", token);
      // اینجا می‌توانید توکن را به بک‌اند خود ارسال کنید
      // sendTokenToServer(token);
    } else {
      console.log("Could not obtain FCM token.");
      return null;
    }

    // مدیریت پیام‌های دریافتی در زمانی که برنامه در foreground است (باز و فعال)
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      // نمایش نوتیفیکیشن عادی در مرورگر (اگر کاربر در برنامه باشد)
      const notificationTitle = payload.notification?.title || "پیام جدید";
      const notificationOptions = {
        body: payload.notification?.body,
        icon: "/icon-192x192.png" // مطمئن شوید آیکون در پوشه public وجود دارد
      };
      // بررسی کنید که آیا مرورگر از نوتیفیکیشن پشتیبانی می‌کند و کاربر اجازه داده است
      if (Notification.permission === "granted") {
        new Notification(notificationTitle, notificationOptions);
      }
    });

    return token; // توکن را برمی‌گرداند

  } catch (error) {
    console.error("Error initializing Firebase Messaging:", error);
    return null; // در صورت بروز هرگونه خطا، null برمی‌گرداند
  }
};

/**
 * درخواست صریح اجازه نوتیفیکیشن از کاربر.
 * این تابع باید توسط رابط کاربری (مانند دکمه در مودال) فراخوانی شود.
 * @returns {Promise<boolean>} true اگر کاربر اجازه 'granted' را بدهد، در غیر این صورت false.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
   if (typeof window === "undefined") return false;
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
}
