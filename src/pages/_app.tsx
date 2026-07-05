import "../../components/plasmic/sayban/plasmic.css"; // plasmic-import: qARqpE4p5tZmJuNxFbTaPz/projectcss
import "@/styles/globals.css";
import "@/styles/date-picker.css";

import { useEffect, useState } from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";

import { initFcm } from "@/lib/fcm"; // مطمئن شو مسیر درست است
import NotificationModal from "@/components/NotificationModal"; // مطمئن شو مسیر درست است

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

      const checkAndShowPrompt = async () => {
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
          await initFcm();
        }
      };
      checkAndShowPrompt();
    }
  }, []);

  // تابع برای فعال کردن اعلان‌ها از داخل مودال
  const handleEnableNotifications = async () => {
    // تابع initFcm باید درخواست رسمی اجازه از مرورگر را انجام دهد
    await initFcm(); 
    // وضعیت اجازه را دوباره چک کن
    setHasNotificationPermission(Notification.permission === 'granted');
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
