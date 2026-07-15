import "../../components/plasmic/sayban/plasmic.css"; // plasmic-import: qARqpE4p5tZmJuNxFbTaPz/projectcss
import "@/styles/globals.css";
import "@/styles/date-picker.css";
import { useEffect, useState } from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { initFcm, requestNotificationPermission } from "@/lib/fcm";
import NotificationModal from "../../components/NotificationModal";
export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  useEffect(() => {
    // ۱. حتماً منتظر بمانیم تا راوتر نکست‌جی‌اس کاملاً آماده شود
    if (!router.isReady) return;
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "Notification" in window
    ) {
      const reminderSetTime = localStorage.getItem("notificationReminderLater");
      const now = new Date().getTime();
      const shouldShowModal =
        !reminderSetTime || now >= Number(reminderSetTime);
      const checkPermissionsAndShowPrompt = async () => {
        const permission = Notification.permission;
        setHasNotificationPermission(permission === "granted");

        // 👇 لاگ برای عیب‌یابی (این مقادیر را در کنسول مرورگر بررسی کنید)
        console.log("--- بررسی شرایط نمایش مودال نوتیفیکیشن ---");
        console.log("آدرس فعلی صفحه (pathname):", router.pathname);
        console.log("آدرس دقیق‌تر (asPath):", router.asPath);
        console.log("وضعیت دسترسی مرورگر (permission):", permission);
        console.log(
          "زمان یادآوری رد شده است؟ (shouldShowModal):",
          shouldShowModal
        );
        console.log(
          "تاریخ انقضای لکال‌استوریج:",
          reminderSetTime
            ? new Date(Number(reminderSetTime)).toLocaleString()
            : "تنظیم نشده"
        );
        if (permission === "granted") {
          console.log("نتیجه: دسترسی از قبل داده شده است. FCM فعال می‌شود.");
          initFcm();
        } else if (
          permission === "default" &&
          shouldShowModal &&
          (router.pathname === "/home" || router.asPath === "/home")
        ) {
          console.log(
            "نتیجه: شرایط برقرار است! مودال تا ۲ ثانیه دیگر نمایش داده می‌شود."
          );
          setTimeout(() => {
            setShowNotificationPrompt(true);
          }, 2000);
        } else {
          console.log("نتیجه: شرایط برقرار نبود. مودال نشان داده نمی‌شود.");
          setShowNotificationPrompt(false);
          setHasNotificationPermission(false);
        }
      };
      checkPermissionsAndShowPrompt();
    } else {
      console.log(
        "نوتیفیکیشن یا سرویس‌ورکر در این مرورگر/محیط پشتیبانی نمی‌شود."
      );
    }
  }, [router.isReady, router.pathname, router.asPath]); // 👈 اضافه شدن متغیرهای کنترلی راوتر

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
    localStorage.removeItem("notificationReminderLater");
  };
  const handleLater = () => {
    setShowNotificationPrompt(false);
    const oneWeekFromNow = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("notificationReminderLater", String(oneWeekFromNow));
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
