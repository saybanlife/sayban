import "../../components/plasmic/sayban/plasmic.css"; // plasmic-import: qARqpE4p5tZmJuNxFbTaPz/projectcss
import "@/styles/globals.css";
import "@/styles/date-picker.css";

import { useEffect, useState } from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";

// Import توابع از فایل fcm.ts
import { initFcm, requestNotificationPermission } from "@/lib/fcm"; // اطمینان حاصل کنید مسیر درست است
import NotificationModal from "@/components/NotificationModal"; // اطمینان حاصل کنید مسیر درست است

export default function MyApp({ Component, pageProps }: AppProps) {
  // State برای کنترل نمایش مودال
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  // State برای اینکه آیا کاربر قبلا اجازه داده است یا نه
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  useEffect(() => {
    // این useEffect فقط در سمت کلاینت (مرورگر) اجرا می‌شود
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {

      // چک کردن localStorage برای یادآوری (اگر کاربر قبلا "بعداً" را انتخاب کرده)
      const reminderSetTime = localStorage.getItem('notificationReminderLater');
      const now = new Date().getTime();

      // اگر زمان یادآوری تنظیم شده و هنوز نگذشته، مودال را نمایش نده
      const shouldShowModal = !reminderSetTime || now >= Number(reminderSetTime);

      const checkPermissionsAndShowPrompt = async () => {
        const permission = Notification.permission;
        setHasNotificationPermission(permission === 'granted');

        // اگر اجازه هنوز "پیش‌فرض" است و نباید یادآوری شود، مودال سفارشی را نمایش بده
        if (permission === 'default' && shouldShowModal) {
          // می‌توانید این تاخیر را تنظیم کنید یا بر اساس تعامل کاربر تغییر دهید
          setTimeout(() => {
            setShowNotificationPrompt(true);
          }, 2000); // تاخیر ۲ ثانیه‌ای مثال
        } else if (permission === 'granted') {
          // اگر قبلاً اجازه داده شده، initFcm را صدا بزن تا توکن تنظیم شود
          // initFcm در این حالت به دلیل بررسی permission در خودش، کار را انجام خواهد داد.
          await initFcm();
        } else {
          // اگر permission 'denied' باشد، مودال را نشان نمی‌دهیم
          setHasNotificationPrompt(false);
        }
      };
      checkPermissionsAndShowPrompt();
    }
  }, []);

  // تابع برای فعال کردن اعلان‌ها از داخل مودال
  const handleEnableNotifications = async () => {
    // 1. ابتدا درخواست رسمی اجازه از مرورگر را انجام بده
    const permissionGranted = await requestNotificationPermission();

    if (permissionGranted) {
      // 2. اگر اجازه داده شد، initFcm را صدا بزن تا توکن را بگیرد و listeners را تنظیم کند
      await initFcm();
      setHasNotificationPermission(true); // وضعیت را آپدیت کن
    } else {
      console.log("User denied notification permission after modal prompt.");
      setHasNotificationPermission(false); // وضعیت را آپدیت کن
      // اگر کاربر اجازه نداد، ممکن است بخواهید یک پیام به او نشان دهید
    }
    // مودال را ببند
    setShowNotificationPrompt(false);
    // اگر کاربر اجازه داد، کلید یادآوری را حذف می‌کنیم چون دیگر لازم نیست
    localStorage.removeItem('notificationReminderLater');
  };

  // تابع برای بستن مودال (رد کردن موقت)
  const handleLater = () => {
    setShowNotificationPrompt(false);
    // ذخیره کردن زمان یادآوری مجدد در localStorage (مثلاً برای 7 روز)
    const oneWeekFromNow = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('notificationReminderLater', String(oneWeekFromNow));
  };

  return (
    <PlasmicRootProvider Head={Head}>
      <Head>
        {/* PWA Manifest and Icons */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6F8A3A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sayban" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {/* Other meta tags if needed */}
      </Head>

      {/* Conditionally render the NotificationModal */}
      {/* مودال فقط زمانی نمایش داده شود که نیاز به پرسیدن باشد و کاربر قبلا اجازه نداده باشد */}
      {showNotificationPrompt && !hasNotificationPermission && (
        <NotificationModal
          handleEnableNotifications={handleEnableNotifications}
          handleLater={handleLater}
        />
      )}

      {/* The main component for the current page */}
      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
