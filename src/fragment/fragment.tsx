import React, { useEffect, useMemo } from "react";
import toast, { ToastPosition, Toaster } from "react-hot-toast";

import {
  DataProvider,
  GlobalActionsProvider,
  GlobalContextMeta,
} from "@plasmicapp/host";
import axios from "axios";

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
  useEffect(() => {
    changeTheme(primaryColor);
  }, [primaryColor]);

  const changeTheme = (color: string) => {
    document.documentElement.style.setProperty("--primary", color);
  };

  const actions = useMemo(
    () => ({
      showToast: (
        type: "success" | "error",
        message: string,
        placement: ToastPosition = "top-right",
        duration?: number
      ) => {
        toast[type ?? "success"](message, {
          duration,
          position: placement,
        });
      },

      apiRequest: async (
        method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH" = "GET",
        url: string,
        params: Record<string, string | string[]> = {},
        body?: Record<string, any>,
        config?: Record<string, any>
      ) => {
        try {
          let result;
          if (method === "GET") {
            result = await axios.get(url, {
              params,
              ...apiConfig,
              ...previewApiConfig,
              ...config,
            });
          } else {
            result = await axios[
              method.toLowerCase() as "post" | "delete" | "put" | "patch"
            ](url, body, {
              params,
              ...apiConfig,
              ...previewApiConfig,
              ...config,
            });
          }
          return result;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return error.response;
          }
        }
      },

      wait: (duration: number = 1000) => {
        return new Promise((resolve) => setTimeout(resolve, duration));
      },

      // -----------------------------
      //       COOKIE: SET & GET
      // -----------------------------
      setCookie: (name: string, value: string, days: number = 7) => {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(
          value
        )}; expires=${expires}; path=/; domain=.liom.app; secure; SameSite=Lax`;
      },

      getCookie: (name: string) => {
        return (
          document.cookie
            .split("; ")
            .find((row) => row.startsWith(name + "="))
            ?.split("=")[1] || null
        );
      },
    }),
    []
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
        <Toaster />
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
    showToast: {
      displayName: "Show Toast",
      parameters: [
        {
          name: "type",
          type: {
            type: "choice",
            options: ["success", "error"],
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

    // -----------------------------
    //        COOKIE ACTIONS
    // -----------------------------
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
  },
};
