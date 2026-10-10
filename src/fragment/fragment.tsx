import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  DataProvider,
  GlobalActionsProvider,
  GlobalContextMeta,
} from "@plasmicapp/host";
import axios from "axios";
import { useRouter } from "next/router";
import NotificationModal from "../../components/NotificationModal";
import { resolveClientApiUrl } from "@/lib/resolveClientApiUrl";
import { mergePublicAuthHeaders } from "@/lib/publicAuthHeaders";
import { deleteCookie, readCookie, writeCookie } from "@/lib/authCookies";
import { logoutPanel } from "@/lib/panelSession";
import { normalizeOptionalProfileNationalCode } from "@/lib/profilePayload";
import { rememberAuthReturn } from "@/lib/guestSession";
import {
  ensureVerifiedPublicAuth,
  hasPhoneVerifiedPublicAuth
} from "@/lib/publicAuthGate";
import PhoneVerifyDialog from "../../components/auth/PhoneVerifyDialog";
import { SaybanToast } from "./CustomToast";
import { PageLoadingOverlay } from "./PageLoadingOverlay";
import { SaybanToaster } from "./SaybanToaster";
import {
  normalizeToastType,
  resolveToastPosition,
  type SaybanToastType
} from "./toastUtils";

/**
 * Writes the user must not interrupt: each ends in a navigation or creates a
 * record, so the page is covered until the request settles. Every generated
 * submit goes through the `apiRequest` action below, so listing routes here
 * avoids editing the (very large) generated interaction handlers.
 *
 * Ordinary writes are intentionally absent — those rely on the button's own
 * `loading` state instead of blocking the whole page.
 */
const BLOCKING_WRITE_ROUTES: { test: RegExp; message: string }[] = [
  { test: /\/users\/validate/i, message: "در حال بررسی کد تأیید..." },
  { test: /\/setProfile/i, message: "در حال ثبت اطلاعات..." },
  { test: /\/panel\/user\/login/i, message: "در حال ورود..." },
  { test: /\/panel\/user\/register\/complete/i, message: "در حال تکمیل اطلاعات مرکز..." },
  { test: /\/panel\/user\/register/i, message: "در حال ایجاد مرکز..." },
  { test: /\/upload\/image/i, message: "در حال بارگذاری مدارک..." },
  { test: /\/reservations\/(update\/)?pay/i, message: "در حال انتقال به درگاه پرداخت..." },
  // Must stay after the payment rule so it does not shadow it.
  { test: /\/reservations(\/|$|\?)/i, message: "در حال ثبت درخواست..." },
  { test: /add\/address/i, message: "در حال ثبت آدرس..." },
  { test: /add\/patients/i, message: "در حال ثبت همراه..." },
  {
    test: /\/panel\/staffs\/update/i,
    message: "در حال ذخیره اطلاعات پرستار..."
  }
];

function resolveBlockingMessage(
  method: string,
  url: string
): string | undefined {
  if (method === "GET") return undefined;
  return BLOCKING_WRITE_ROUTES.find(route => route.test.test(url))?.message;
}

/** Writes that require phone OTP (guest JWT alone is not enough). */
const PHONE_AUTH_WRITE_ROUTES: RegExp[] = [
  /\/reservations(\/|$|\?)/i,
  /add\/address/i,
  /add\/patients/i,
  /\/setProfile/i
];

function requiresPhoneVerifiedAuth(method: string, url: string): boolean {
  if (method === "GET") return false;
  return PHONE_AUTH_WRITE_ROUTES.some(test => test.test(url));
}

type FragmentProps = React.PropsWithChildren<{
  previewApiConfig: Record<string, any>;
  apiConfig: Record<string, any>;
  rtl: boolean;
  primaryColor: string;
}>;

export const Fragment = ({
  children,
  previewApiConfig,
  apiConfig,
  rtl,
  primaryColor,
}: FragmentProps) => {
  const router = useRouter();

  useEffect(() => {
    changeTheme(primaryColor);
  }, [primaryColor]);

  const [forceShowModal, setForceShowModal] = useState<boolean>(false);

  /**
   * Blocking page loader. Reference-counted so overlapping flows (an outer
   * submit that triggers an inner request) cannot hide it early — it stays up
   * until the last caller releases it.
   */
  const [pageLoading, setPageLoading] = useState<{
    count: number;
    message?: string;
  }>({ count: 0 });

  const changeTheme = (color: string) => {
    document.documentElement.style.setProperty("--primary", color);
  };

  const actions = useMemo(
    () => ({
      showToast: (
        type: SaybanToastType | string = "success",
        message: string,
        _placement?: string,
        duration?: number,
        subtitle?: string
      ) => {
        const variant = normalizeToastType(type);
        const position = resolveToastPosition(router.pathname);
        const fromTop = position.startsWith("top");

        toast.custom(
          (toastItem) => (
            <SaybanToast
              toastItem={toastItem}
              variant={variant}
              title={message}
              subtitle={subtitle}
              fromTop={fromTop}
              onDismiss={() => toast.dismiss(toastItem.id)}
            />
          ),
          {
            duration: duration ?? 4000,
            position
          }
        );
      },
      openNotificationModal: () => {
        setForceShowModal(true);
      },

      showPageLoading: (message?: string) => {
        setPageLoading(prev => ({
          count: prev.count + 1,
          message: message || prev.message
        }));
      },

      hidePageLoading: () => {
        setPageLoading(prev => {
          const count = Math.max(0, prev.count - 1);
          return { count, message: count === 0 ? undefined : prev.message };
        });
      },

      apiRequest: async (
        method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH" = "GET",
        url: string,
        params: Record<string, string | string[]> = {},
        body?: Record<string, any>,
        config?: Record<string, any>
      ) => {
        const blockingMessage = resolveBlockingMessage(method, url);
        if (blockingMessage) {
          setPageLoading(prev => ({
            count: prev.count + 1,
            message: blockingMessage
          }));
        }
        try {
          if (
            requiresPhoneVerifiedAuth(method, url) &&
            !hasPhoneVerifiedPublicAuth()
          ) {
            if (typeof window !== "undefined") {
              rememberAuthReturn(
                `${window.location.pathname}${window.location.search || ""}`
              );
              ensureVerifiedPublicAuth({
                message: "برای ادامه، شماره موبایل خود را تأیید کنید."
              });
            }
            return {
              data: {
                success: false,
                message: "برای ادامه، شماره موبایل خود را تأیید کنید."
              }
            };
          }
          const finalUrl = resolveClientApiUrl(url);
          const authConfig = mergePublicAuthHeaders({
            ...apiConfig,
            ...previewApiConfig,
            ...config
          });
          let result;
          if (method === "GET") {
            result = await axios.get(finalUrl, {
              params,
              ...authConfig
            });
          } else {
            result = await axios[
              method.toLowerCase() as "post" | "delete" | "put" | "patch"
            ](finalUrl, normalizeOptionalProfileNationalCode(url, body), {
              params,
              ...authConfig
            });
          }
          return result;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return error.response;
          }
        } finally {
          if (blockingMessage) {
            setPageLoading(prev => {
              const count = Math.max(0, prev.count - 1);
              return { count, message: count === 0 ? undefined : prev.message };
            });
          }
        }
      },

      wait: (duration: number = 1000) => {
        return new Promise((resolve) => setTimeout(resolve, duration));
      },

      setCookie: (name: string, value: string, days: number = 7) => {
        writeCookie(name, value, days);
      },

      getCookie: (name: string) => {
        return readCookie(name);
      },

      deleteCookie: (name: string) => {
        deleteCookie(name);
      },

      logoutPanel: () => {
        logoutPanel();
      },
    }),
    [apiConfig, previewApiConfig, router.pathname]
  );

  return (
    <GlobalActionsProvider contextName="Fragment" actions={actions}>
      <DataProvider
        name="Fragment"
        data={{
          apiConfig: apiConfig ?? {},
          previewApiConfig: previewApiConfig ?? {},
          rtl,
          primaryColor,
        }}
        hidden
      >
        {children}
        <PhoneVerifyDialog />
        <SaybanToaster />
        {pageLoading.count > 0 && (
          <PageLoadingOverlay message={pageLoading.message} />
        )}
        {forceShowModal && (
          <NotificationModal
            handleEnableNotifications={async () => {
              try {
                const { isSaybanNativeAndroid } = await import(
                  "@/lib/nativeShell"
                );
                const { requestNotificationPermission, initFcm } = await import(
                  "@/lib/fcm"
                );

                if (isSaybanNativeAndroid()) {
                  const { requestNativeNotificationPermission, enableNotificationsWithFcm } =
                    await import("@/lib/notificationStatus");
                  await requestNativeNotificationPermission();
                  await enableNotificationsWithFcm();
                } else {
                  const permissionGranted = await requestNotificationPermission();
                  if (permissionGranted) {
                    initFcm();
                  } else {
                    console.log(
                      "User denied notification permission after manual action trigger."
                    );
                  }
                }
              } catch (err) {
                console.error("Failed to initialize FCM from Fragment action:", err);
              } finally {
                setForceShowModal(false);
              }
            }}
            handleLater={() => {
              setForceShowModal(false);
            }}
          />
        )}
      </DataProvider>
    </GlobalActionsProvider>
  );
};

export const fragmentMeta: GlobalContextMeta<FragmentProps> = {
  name: "Fragment",
  displayName: "Fragment",
  importPath: "@/fragment/fragment",
  props: {
    apiConfig: {
      displayName: "API Config",
      type: "object",
      description: `{ withCredentials: true }`,
    },
    previewApiConfig: {
      displayName: "Preview API Config",
      type: "object",
      editOnly: true,
      description: `{ headers: { 'Authorization': 'XXX' } }`,
    },
    rtl: {
      displayName: "RTL",
      type: "boolean",
    },
    primaryColor: {
      displayName: "Primary Color",
      type: "color",
      defaultValue: "#000000",
      defaultValueHint: "#000000",
    },
  },
  providesData: true,

  globalActions: {
    openNotificationModal: {
      displayName: "Open Notification Modal",
      parameters: [],
    },

    showPageLoading: {
      displayName: "Show Page Loading",
      parameters: [
        {
          name: "message",
          type: {
            type: "string",
            defaultValueHint: "در حال بارگذاری...",
          },
        },
      ],
    },

    hidePageLoading: {
      displayName: "Hide Page Loading",
      parameters: [],
    },
    showToast: {
      displayName: "Show Toast",
      parameters: [
        {
          name: "type",
          type: {
            type: "choice",
            options: ["success", "error", "info", "warning"],
          },
        },
        {
          name: "message",
          type: {
            type: "string",
            required: true,
          },
        },
        {
          name: "placement",
          type: {
            type: "choice",
            options: [
              "top-left",
              "top-center",
              "top-right",
              "bottom-left",
              "bottom-center",
              "bottom-right",
            ],
          },
        },
        {
          name: "duration",
          type: {
            type: "number",
          },
        },
        {
          name: "subtitle",
          type: {
            type: "string",
          },
        },
      ],
    },

    wait: {
      displayName: "Wait",
      parameters: [
        {
          name: "duration",
          type: {
            type: "number",
            defaultValue: 1000,
          },
        },
      ],
    },

    apiRequest: {
      displayName: "API Request",
      parameters: [
        {
          name: "method",
          type: {
            type: "choice",
            options: ["GET", "POST", "DELETE", "PUT", "PATCH"],
          },
        },
        {
          name: "url",
          displayName: "URL",
          type: {
            type: "string",
            required: true,
          },
        },
        {
          name: "params",
          displayName: "Query Params",
          type: {
            type: "object",
          },
        },
        {
          name: "body",
          displayName: "Body",
          type: {
            type: "object",
          },
        },
        {
          name: "config",
          displayName: "Request Config",
          type: {
            type: "object",
          },
        },
      ],
    },

    setCookie: {
      displayName: "Set Cookie",
      parameters: [
        {
          name: "name",
          type: {
            type: "string",
            required: true,
            defaultValueHint: "token",
          },
        },
        {
          name: "value",
          type: {
            type: "string",
            required: true,
            defaultValueHint: "12345",
          },
        },
        {
          name: "days",
          type: {
            type: "number",
            defaultValueHint: 7,
          },
        },
      ],
    },

    getCookie: {
      displayName: "Get Cookie",
      parameters: [
        {
          name: "name",
          type: {
            type: "string",
            required: true,
            defaultValueHint: "token",
          },
        },
      ],
    },

    deleteCookie: {
      displayName: "Delete Cookie",
      parameters: [
        {
          name: "name",
          type: {
            type: "string",
            required: true,
            defaultValueHint: "token",
          },
        },
      ],
    },

    logoutPanel: {
      displayName: "Logout Panel",
      parameters: [],
    },
  },
};
