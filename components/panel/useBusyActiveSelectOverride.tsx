import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { setCenterActiveStatus } from "../centerPanel/centerActiveStatus";

export type BusyActiveSelectOverrideOptions = {
  centerId?: string | number;
  token?: string;
  /** When set, performs the status update here and shows success/error toasts. */
  showStatusToast?: boolean;
};

function centerActiveStatusToastMessage(isActive: boolean) {
  return isActive
    ? "مرکز با موفقیت فعال شد"
    : "مرکز با موفقیت غیرفعال شد";
}

/**
 * Wraps a panel «فعال/غیرفعال» Select so rapid re-selection cannot fire
 * overlapping status calls. While busy the select is disabled.
 * Uses `panel/center/active-status` (centers.is_active), not update/info.
 */
export function useBusyActiveSelectOverride(
  name = "active",
  options?: BusyActiveSelectOverrideOptions
) {
  const [busy, setBusy] = React.useState(false);
  const busyRef = React.useRef(false);
  const globalActions = useGlobalActions();
  const showStatusToast = options?.showStatusToast === true;

  return React.useMemo(
    () => ({
      [name]: {
        render: (renderProps: any, Select: React.ComponentType<any>) => (
          <Select
            {...renderProps}
            isDisabled={busy || renderProps.isDisabled}
            onChange={async (...eventArgs: any[]) => {
              if (busyRef.current) return;

              const initOnly = Boolean(eventArgs[1]?._plasmic_state_init_);
              if (initOnly || !showStatusToast) {
                busyRef.current = true;
                setBusy(true);
                try {
                  await renderProps.onChange?.(...eventArgs);
                } finally {
                  busyRef.current = false;
                  setBusy(false);
                }
                return;
              }

              const nextVal = String(eventArgs[0] ?? "");
              const prevVal = String(renderProps.value ?? "");
              if (nextVal === prevVal) return;

              const centerId = options?.centerId;
              if (centerId == null || centerId === "") {
                await renderProps.onChange?.(...eventArgs);
                return;
              }

              busyRef.current = true;
              setBusy(true);
              await renderProps.onChange?.(nextVal, {
                _plasmic_state_init_: true
              });

              const toast = (type: "success" | "error", message: string) =>
                globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

              try {
                await setCenterActiveStatus(centerId, nextVal === "1");
                toast("success", centerActiveStatusToastMessage(nextVal === "1"));
              } catch (error) {
                await renderProps.onChange?.(prevVal, {
                  _plasmic_state_init_: true
                });
                toast(
                  "error",
                  error instanceof Error
                    ? error.message
                    : "تغییر وضعیت مرکز ناموفق بود."
                );
              } finally {
                busyRef.current = false;
                setBusy(false);
              }
            }}
          />
        )
      }
    }),
    [busy, globalActions, name, options?.centerId, showStatusToast]
  );
}
