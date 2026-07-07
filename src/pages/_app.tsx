import "../../components/plasmic/sayban/plasmic.css"; // plasmic-import: qARqpE4p5tZmJuNxFbTaPz/projectcss
import "@/styles/globals.css";
import "@/styles/date-picker.css";

import { useEffect, useState } from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router"; // <--- ۱. اضافه کردن راوتر نکست‌جی‌اس

// Import توابع از فایل fcm.ts
import { initFcm, requestNotificationPermission } from "@/lib/fcm"; 
import NotificationModal from "../../components/NotificationModal";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter(); // <--- ۲. ساختن نمونه از راوتر
  
  // State برای کنترل نمایش مودال
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  // State برای اینکه آیا کاربر قبلا اجازه داده است یا نه
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {

      const reminderSetTime = localStorage.getItem('notificationReminderLater');
      const now = new Date().getTime();
      const shouldShowModal = !reminderSetTime || now >= Number(reminderSetTime);

      const checkPermissionsAndShowPrompt = async () => {
        const permission = Notification.permission;
        setHasNotificationPermission(permission === 'granted');

        if (permission === 'granted') {
          // اگر کاربر قبلاً اجازه داده، فرقی نمی‌کند در کدام صفحه است؛ FCM فعال شود.
          initFcm();
        } else if (permission === 'default' && shouldShowModal && router.pathname === "/home") {
          setTimeout(() => {
            setShowNotificationPrompt(true);
          }, 2000);
        } else {
          setShowNotificationPrompt(false);
          setHasNotificationPermission(false);
        }
      };
      checkPermissionsAndShowPrompt();
    }
  }, [router.pathname]); // <--- ۴. اضافه کردن مسیر به آرایه وابستگی‌ها (Dependency Array)

  const handleEnableNotifications = async () => {
    const permissionGranted = await requestNotificationPermission();

    if (permissionGranted) {
      await initFcm();
      setHasNotificationPermission(true); 
    } else {
      console.log("User denied notification permission after modal prompt.");
      setHasNotificationPermission(false);
    }
    setShowNotificationPrompt(false);
    localStorage.removeItem('notificationReminderLater');
  };

  const handleLater = () => {
    setShowNotificationPrompt(false);
    const oneWeekFromNow = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('notificationReminderLater', String(oneWeekFromNow));
  };

  return (
    <PlasmicRootProvider Head={Head}>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6F8A3A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sayban" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </Head>

      {/* مودال فقط در صورتی رندر می‌شود که شرط مسیر در useEffect تایید شده باشد */}
      {showNotificationPrompt && !hasNotificationPermission && (
        <NotificationModal
          handleEnableNotifications={handleEnableNotifications}
          handleLater={handleLater}
        />
      )}

      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
