import { firebaseApp } from "./firebase"; // مطمئن شو این مسیر درست است
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

// کلید VAPID تولید شده در کنسول فایربیس را اینجا بگذارید:
const VAPID_KEY = "BB5iK65gAz1q5PnKQDv_6wqV-dXMMpNg4E6iaAZje7kLM1Nrxb_NPkw2HFDo7Y-FJKiq8nlov7RZsvtkGeGEIj0";

// --- تنظیمات مورد نیاز ---
// آدرس API سرور شما برای ثبت توکن FCM
const SERVER_URL = "YOUR_SERVER_API_ENDPOINT"; // <-- این را با آدرس واقعی سرور خود جایگزین کنید
// نام کوکی که توکن احراز هویت کاربر در آن ذخیره شده است
const AUTH_COOKIE_NAME = "your_auth_cookie_name"; // <-- نام کوکی را اینجا وارد کنید (مثلا 'session_token', 'authToken', ...)
// ------------------------


/**
 * تابع کمکی برای دریافت مقدار یک کوکی خاص از document.cookie.
 * @param {string} name - نام کوکی مورد نظر.
 * @returns {string | null} مقدار کوکی در صورت یافت شدن، در غیر این صورت null.
 */
function getCookie(name: string): string | null {
  // اطمینان از اینکه این کد فقط در سمت مرورگر (client-side) اجرا می‌شود
  if (typeof document === 'undefined') return null;

  const nameEQ = name + "=";
  // کوکی‌ها را با جدا کردن ';' به آرایه تبدیل می‌کنیم
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    // حذف فضاهای خالی ابتدایی کوکی
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    // اگر کوکی مورد نظر یافت شد، مقدار آن را برمی‌گردانیم
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null; // اگر کوکی یافت نشد
}


/**
 * Firebase Cloud Messaging را مقداردهی اولیه می‌کند، توکن را دریافت کرده و به سرور ارسال می‌کند.
 * این تابع فرض می‌کند که اجازه نوتیفیکیشن قبلاً توسط کاربر داده شده است.
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

    // **مهم:** این تابع فقط زمانی اجرا می‌شود که کاربر قبلاً اجازه داده باشد ('granted').
    if (Notification.permission !== "granted") {
      console.log("Notification permission is not granted. Skipping FCM token initialization.");
      return null;
    }

    // ثبت Service Worker اختصاصی فایربیس
    const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("Firebase Service Worker registered.");

    const messaging = getMessaging(firebaseApp);

    // گرفتن توکن FCM
    const fcmToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (fcmToken) {
      console.log("FCM Token obtained:", fcmToken);
      // --- ارسال درخواست به سرور با توکن احراز هویت از کوکی ---
      await sendTokenToServer(fcmToken);
      // ----------------------------------------------------------
    } else {
      console.log("Could not obtain FCM token.");
      return null;
    }

    // مدیریت نوتیفیکیشن‌های Foreground
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      const notificationTitle = payload.notification?.title || "پیام جدید";
      const notificationOptions = {
        body: payload.notification?.body,
        icon: "/icon-192x192.png" // مطمئن شوید آیکون در پوشه public وجود دارد
      };
      if (Notification.permission === "granted") {
        new Notification(notificationTitle, notificationOptions);
      }
    });

    return fcmToken; // توکن FCM را برمی‌گرداند

  } catch (error) {
    console.error("Error initializing Firebase Messaging:", error);
    return null;
  }
};

/**
 * تابع کمکی برای ارسال توکن FCM به سرور.
 * توکن احراز هویت کاربر را از کوکی دریافت کرده و در هدر Authorization به صورت Bearer ارسال می‌کند.
 * @param {string} fcmToken - توکن FCM دریافتی از Firebase.
 */
const sendTokenToServer = async (fcmToken: string) => {
  // بررسی اینکه آیا URL سرور تنظیم شده است
  if (!SERVER_URL || SERVER_URL === "YOUR_SERVER_API_ENDPOINT") {
    console.warn("Server URL for sending FCM token is not configured. Skipping request.");
    return;
  }

  // دریافت توکن احراز هویت کاربر از کوکی
  const authToken = getCookie(AUTH_COOKIE_NAME);

  // اگر کوکی احراز هویت یافت نشد، نمی‌توانیم توکن FCM را به کاربر صحیح نسبت دهیم.
  if (!authToken) {
    console.warn(`Authentication cookie "${AUTH_COOKIE_NAME}" not found. Cannot send FCM token with authorization.`);
    // شما می‌توانید اینجا تصمیم بگیرید که آیا همچنان توکن FCM را بدون احراز هویت بفرستید یا خیر.
    // در این مثال، اگر توکن احراز هویت نباشد، درخواست ارسال نمی‌شود.
    return;
  }

  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // اضافه کردن هدر Authorization با توکن احراز هویت کاربر
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: fcmToken, // این توکن FCM است که از Firebase گرفته شده
        // اگر نیاز است، می‌توانید شناسه کاربر را نیز از کوکی یا جای دیگر بگیرید و ارسال کنید.
        // مثلاً اگر نام کوکی شما 'user_id' باشد:
        // userId: getCookie('user_id'),
        platform: "web", // مشخص کردن پلتفرم (وب)
      }),
    });

    if (response.ok) {
      console.log("FCM token successfully sent to server with Bearer authentication.");
    } else {
      console.error(`Failed to send FCM token to server. Status: ${response.status}`);
      // برای خطاهای غیر 2xx، سعی در خواندن جزئیات خطا از پاسخ سرور
      try {
        const errorData = await response.json();
        console.error("Server error details:", errorData);
      } catch (e) {
        console.error("Could not parse error response JSON.");
      }
    }
  } catch (error) {
    console.error("Network error sending FCM token to server:", error);
  }
};

/**
 * درخواست صریح اجازه نوتیفیکیشن از کاربر.
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
