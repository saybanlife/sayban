import * as React from "react";
import { useRouter } from "next/router";
import { centerDetailPath, centerInfoPath } from "@/lib/panelCenterNavigation";
import {
  PlasmicMainPageCenter,
  DefaultMainPageCenterProps
} from "./plasmic/sayban/PlasmicMainPageCenter";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import styles from "./AdminTablesTheme.module.css";
import { setCenterAccountStatus } from "./centerPanel/centerAccountStatus";
import { setCenterActiveStatus } from "./centerPanel/centerActiveStatus";

export interface MainPageCenterProps extends DefaultMainPageCenterProps {}

type SwitchKind = "account" | "center";

function resolveSwitchKind(control: HTMLElement): SwitchKind | null {
  const cell = control.closest("td");
  const row = control.closest("tr");
  const table = control.closest("table");
  if (!cell || !row || !table) return null;

  const cells = Array.from(row.children).filter(
    el => el.tagName.toLowerCase() === "td"
  ) as HTMLElement[];
  const index = cells.indexOf(cell);
  if (index < 0) return null;

  const headerCells = Array.from(
    table.querySelectorAll("thead tr th, thead tr td")
  ) as HTMLElement[];
  const title = String(headerCells[index]?.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  if (title.includes("حساب")) return "account";
  if (title.includes("مرکز")) return "center";

  // Fallback: last switch column is center, previous is account.
  const switchesInRow = Array.from(row.querySelectorAll(".ant-switch"));
  const switchIndex = switchesInRow.indexOf(control);
  if (switchIndex === switchesInRow.length - 1) return "center";
  if (switchIndex >= 0) return "account";
  return null;
}

/**
 * RichTable renders boolean columns as display-only antd switches, so clicks are
 * captured here and turned into status updates. Capture phase is required because
 * the row click navigates to the center panel.
 */
function useCenterListSwitches(
  onToast: (type: "success" | "error", message: string) => void
) {
  const busyRef = React.useRef(false);

  return React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest?.(".ant-switch") as HTMLElement | null;
      if (!control) return;

      event.preventDefault();
      event.stopPropagation();

      const row = control.closest("tr[data-row-key]") as HTMLElement | null;
      const centerId = row?.getAttribute("data-row-key");
      if (!centerId) return;
      if (busyRef.current || control.getAttribute("aria-disabled") === "true") {
        return;
      }

      const kind = resolveSwitchKind(control);
      if (!kind) return;

      const wasChecked = control.classList.contains("ant-switch-checked");
      const next = !wasChecked;

      const paint = (checked: boolean) => {
        control.classList.toggle("ant-switch-checked", checked);
        control.setAttribute("aria-checked", checked ? "true" : "false");
      };

      busyRef.current = true;
      control.setAttribute("aria-disabled", "true");
      paint(next);

      const request =
        kind === "account"
          ? setCenterAccountStatus(centerId, next).then(result => {
              if (!result) {
                paint(wasChecked);
                onToast("error", "این مرکز حساب کاربری فعالی ندارد.");
                return;
              }
              const applied = Number(result.is_active) === 1;
              paint(applied);
              onToast(
                "success",
                applied
                  ? "حساب کاربری مرکز فعال شد."
                  : "حساب کاربری مرکز غیرفعال شد."
              );
            })
          : setCenterActiveStatus(centerId, next).then(result => {
              const applied = Number(result.is_active) === 1;
              paint(applied);
              onToast(
                "success",
                applied
                  ? "مرکز با موفقیت فعال شد"
                  : "مرکز با موفقیت غیرفعال شد"
              );
            });

      request
        .catch(() => {
          paint(wasChecked);
          onToast(
            "error",
            kind === "account"
              ? "تغییر وضعیت حساب کاربری ناموفق بود."
              : "تغییر وضعیت مرکز ناموفق بود."
          );
        })
        .finally(() => {
          busyRef.current = false;
          control.removeAttribute("aria-disabled");
        });
    },
    [onToast]
  );
}

function MainPageCenter_(
  props: MainPageCenterProps,
  ref: HTMLElementRefOf<"div">
) {
  const router = useRouter();
  const globalActions = useGlobalActions();
  const [search, setSearch] = React.useState("");
  const draftSearchRef = React.useRef("");

  const showToast = React.useCallback(
    (type: "success" | "error", message: string) => {
      globalActions?.["Fragment.showToast"]?.(type, message, "top-center");
    },
    [globalActions]
  );

  const onCaptureClick = useCenterListSwitches(showToast);

  const applySearch = React.useCallback((value: string) => {
    const next = String(value ?? "").trim();
    setSearch(prev => (prev === next ? prev : next));
  }, []);

  const openRegistrationReview = React.useCallback(
    (rowKey: string | number, row?: Record<string, unknown>) => {
      const path = centerInfoPath(row?.id ?? rowKey);
      if (path) void router.push(path);
    },
    [router]
  );

  return (
    <div
      className={`${styles.panelTablePage} ${styles.serverPaged}`}
      onClickCapture={onCaptureClick}
      data-sayban-centers-table="true"
    >
      <PlasmicMainPageCenter
        {...props}
        overrides={{
          centers: {
            render: (renderProps: any, DefaultApiRequest: any) => (
              <DefaultApiRequest
                {...renderProps}
                params={{
                  ...(renderProps.params || {}),
                  search: search || undefined
                }}
              />
            )
          },
          table: {
            render: (renderProps: any, DefaultTable: any) => {
              const prevActions = Array.isArray(renderProps.rowActions)
                ? renderProps.rowActions
                : [];
              const fields = (
                Array.isArray(renderProps.fields) ? [...renderProps.fields] : []
              ).filter(
                (field: { fieldId?: string; key?: string }) =>
                  field?.fieldId !== "approval_status" &&
                  field?.key !== "approval_status"
              );
              return (
                <DefaultTable
                  {...renderProps}
                  onRowClick={(rowKey: string, row: Record<string, unknown>) => {
                    const path = centerDetailPath(rowKey, row);
                    if (path) void router.push(path);
                  }}
                  fields={fields}
                  rowActions={[
                    {
                      type: "item",
                      label: "مشاهده اطلاعات",
                      onClick: (
                        rowKey: string,
                        row: Record<string, unknown>
                      ) => {
                        openRegistrationReview(rowKey, row);
                      }
                    },
                    ...prevActions
                  ]}
                />
              );
            }
          },
          textInput: {
            render: (renderProps: any, DefaultTextInput: any) => (
              <DefaultTextInput
                {...renderProps}
                onChange={(value: string, ...rest: any[]) => {
                  draftSearchRef.current = String(value ?? "");
                  renderProps.onChange?.(value, ...rest);
                }}
                ariaInputOnBlur={(event: any) => {
                  applySearch(draftSearchRef.current);
                  renderProps.ariaInputOnBlur?.(event);
                }}
              />
            )
          },
          root: {
            render: (renderProps: any, DefaultRoot: any) => (
              <DefaultRoot {...renderProps} ref={ref} />
            )
          }
        }}
      />
    </div>
  );
}

const MainPageCenter = React.forwardRef(MainPageCenter_);
export default MainPageCenter;
