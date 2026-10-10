import "../../components/plasmic/sayban/plasmic.css"; // plasmic-import: qARqpE4p5tZmJuNxFbTaPz/projectcss
import "@/styles/globals.css";
import "@/styles/date-picker.css";
import "@/styles/panel-theme.css";

import { useEffect, useLayoutEffect, useState } from "react";
import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { initFcm, isPanelAppPath, requestNotificationPermission } from "@/lib/fcm";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import NotificationModal from "../../components/NotificationModal";
import {
  SAYBAN_APP_SHORT_NAME,
  SAYBAN_LOGO_SRC
} from "@/lib/brandAssets";
import RouteLoadingOverlay from "@/fragment/RouteLoadingOverlay";
import {
  applyPanelTheme,
  clearPanelThemeClass,
  PANEL_THEME_STORAGE_KEY,
  readStoredPanelTheme
} from "@/lib/panelTheme";

const PANEL_THEME_BOOTSTRAP = `(function(){try{var p=location.pathname;var wide=p.indexOf("/panel")===0||p.indexOf("/plasmic-host")===0;document.documentElement.dataset.saybanShell=wide?"wide":"app";if(wide){var t=localStorage.getItem("${PANEL_THEME_STORAGE_KEY}");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.dataset.panelTheme="dark";document.documentElement.style.colorScheme="dark";}}}catch(e){}})();`;

function resolveSaybanShell(pathname: string): "app" | "wide" {
  if (pathname.startsWith("/panel") || pathname.startsWith("/plasmic-host")) {
    return "wide";
  }
  return "app";
}

function shouldPromptNotifications(pathname: string, asPath: string): boolean {
  if (pathname === "/home/" || asPath === "/home/") return true;
  if (!isPanelAppPath(pathname) && !isPanelAppPath(asPath)) return false;
  return Boolean(readCookie(PANEL_AUTH_COOKIE_NAME));
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);

  // Public consumer app: phone-width shell on large screens. Panel stays full-width.
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const shell = resolveSaybanShell(router.pathname);
    document.documentElement.dataset.saybanShell = shell;
    if (shell === "wide") {
      applyPanelTheme(readStoredPanelTheme());
    } else {
      clearPanelThemeClass();
    }
  }, [router.pathname]);

  // Android WebView: bind once. Native shell uploads FCM; only sync UI status here.
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let removeListeners: (() => void) | undefined;
    let lastInitAt = 0;

    void (async () => {
      const { isSaybanNativeAndroid, readNativeNotificationStatus } =
        await import("@/lib/nativeShell");
      if (cancelled || !isSaybanNativeAndroid()) return;

      const maybeInit = () => {
        const next = readNativeNotificationStatus();
        setHasNotificationPermission(Boolean(next?.enabled));
        if (!next?.enabled) return;
        const now = Date.now();
        if (now - lastInitAt < 15_000) return;
        lastInitAt = now;
        void initFcm();
      };

      maybeInit();
      window.addEventListener("sayban-native-ready", maybeInit);
      window.addEventListener("sayban-fcm-updated", maybeInit);
      removeListeners = () => {
        window.removeEventListener("sayban-native-ready", maybeInit);
        window.removeEventListener("sayban-fcm-updated", maybeInit);
      };
    })();

    return () => {
      cancelled = true;
      removeListeners?.();
    };
  }, [router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    const run = async () => {
      const { isSaybanNativeAndroid } = await import("@/lib/nativeShell");
      if (cancelled || isSaybanNativeAndroid()) return;

      if (!("serviceWorker" in navigator) || !("Notification" in window)) {
        console.log(
          "نوتیفیکیشن یا سرویس‌ورکر در این مرورگر/محیط پشتیبانی نمی‌شود."
        );
        return;
      }

      const reminderSetTime = localStorage.getItem("notificationReminderLater");
      const now = new Date().getTime();
      const shouldShowModal =
        !reminderSetTime || now >= Number(reminderSetTime);
      const permission = Notification.permission;
      setHasNotificationPermission(permission === "granted");

      if (permission === "granted") {
        initFcm();
      } else if (
        permission === "default" &&
        shouldShowModal &&
        shouldPromptNotifications(router.pathname, router.asPath)
      ) {
        setTimeout(() => {
          if (!cancelled) setShowNotificationPrompt(true);
        }, 2000);
      } else {
        setShowNotificationPrompt(false);
        setHasNotificationPermission(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.pathname, router.asPath]);

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
        <title>{SAYBAN_APP_SHORT_NAME}</title>
        <meta name="application-name" content={SAYBAN_APP_SHORT_NAME} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#172E24" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content={SAYBAN_APP_SHORT_NAME} />
        <meta property="og:image" content={SAYBAN_LOGO_SRC} />
      </Head>
      <Script
        id="sayban-panel-theme-boot"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: PANEL_THEME_BOOTSTRAP }}
      />

      {showNotificationPrompt && !hasNotificationPermission && (
        <NotificationModal
          handleEnableNotifications={handleEnableNotifications}
          handleLater={handleLater}
          {...(isPanelAppPath(router.pathname) || isPanelAppPath(router.asPath)
            ? {
                title: "اعلان‌های پنل را فعال کنید",
                description:
                  "با فعال‌سازی اعلان‌ها، پیام‌ها و رویدادهای مهم پنل را به‌موقع دریافت می‌کنید."
              }
            : {})}
        />
      )}

      <RouteLoadingOverlay />

      <Component {...pageProps} />
    </PlasmicRootProvider>
  );
}
