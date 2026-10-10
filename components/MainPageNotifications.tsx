import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes";
import {
  PANEL_AUTH_COOKIE_NAME,
  readCookie
} from "../src/lib/authCookies";
import { SAYBAN_APP_SHORT_NAME, SAYBAN_LOGO_SRC } from "@/lib/brandAssets";
import Button from "./Button";
import EmptyPage from "./EmptyPage";
import styles from "./MainPageHomeSlider.module.css";
import localStyles from "./MainPageNotifications.module.css";

export type PanelNotificationItem = {
  id: number;
  panel_user_id?: number | null;
  title: string;
  text: string;
  action?: string | null;
  notification_type?: string | null;
  created_at?: string | null;
  is_seen?: number | boolean | null;
  image?: string | null;
};

type MainPageNotificationsProps = {
  token?: string;
  className?: string;
};

function resolvePanelToken(explicit?: string): string | undefined {
  const fromProp = String(explicit ?? "").trim();
  if (fromProp) return fromProp;
  return readCookie(PANEL_AUTH_COOKIE_NAME) || undefined;
}

async function panelRequest(
  token: string | undefined,
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function normalizeItems(raw: unknown): PanelNotificationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(row => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const id = Number(item.id);
      const text = String(item.text ?? "").trim();
      if (!Number.isFinite(id) || !text) return null;
      return {
        id,
        panel_user_id:
          item.panel_user_id != null ? Number(item.panel_user_id) : null,
        title: String(item.title ?? "اعلان").trim() || "اعلان",
        text,
        action: item.action != null ? String(item.action) : null,
        notification_type:
          item.notification_type != null
            ? String(item.notification_type)
            : null,
        created_at:
          item.created_at != null ? String(item.created_at) : null,
        is_seen:
          item.is_seen === true ||
          item.is_seen === 1 ||
          item.is_seen === "1"
            ? 1
            : item.is_seen === false ||
                item.is_seen === 0 ||
                item.is_seen === "0"
              ? 0
              : null,
        image: item.image != null ? String(item.image) : null
      } satisfies PanelNotificationItem;
    })
    .filter(Boolean) as PanelNotificationItem[];
}

function isSeen(item: PanelNotificationItem): boolean {
  return (
    item.is_seen === true ||
    item.is_seen === 1 ||
    String(item.is_seen ?? "") === "1"
  );
}

function formatWhen(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(d);
  } catch {
    return d.toLocaleString("fa-IR");
  }
}

/**
 * Panel staff inbox (`panel__notification`), parallel to public `/notif`.
 */
export function MainPageNotifications({
  token,
  className
}: MainPageNotificationsProps) {
  const router = useRouter();
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const authToken = resolvePanelToken(token);
  const [items, setItems] = React.useState<PanelNotificationItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const unreadCount = React.useMemo(
    () => items.filter(item => !isSeen(item)).length,
    [items]
  );

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { ok, data } = await panelRequest(
        authToken,
        "GET",
        PANEL_ROUTES.notifications
      );
      if (!ok || data?.success === false) {
        const message = data?.message || "بارگذاری اعلان‌ها ناموفق بود.";
        setLoadError(message);
        toast("error", message);
        return;
      }
      setItems(normalizeItems(data?.result));
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const markSeen = async (item: PanelNotificationItem) => {
    if (isSeen(item)) return;
    setBusyId(item.id);
    try {
      const { ok, data } = await panelRequest(
        authToken,
        "POST",
        PANEL_ROUTES.notificationsSeen,
        { id: item.id }
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "ثبت مشاهده ناموفق بود.");
        return;
      }
      setItems(current =>
        current.map(row =>
          row.id === item.id ? { ...row, is_seen: 1 } : row
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  const openAction = async (item: PanelNotificationItem) => {
    await markSeen(item);
    const action = String(item.action || "").trim();
    if (!action || action === "/") return;
    if (/^https?:\/\//i.test(action)) {
      window.open(action, "_blank", "noopener,noreferrer");
      return;
    }
    const path = action.startsWith("/") ? action : `/${action}`;
    void router.push(path.startsWith("/panel") ? path : `/panel${path}`);
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.title}>
          اعلان‌ها
          {unreadCount > 0 ? (
            <span className={localStyles.badge}>{unreadCount}</span>
          ) : null}
        </div>
        <div className={styles.headerActions}>
          <Button
            color="muted"
            disabled={loading}
            label="بازخوانی"
            onClick={() => {
              void loadItems();
            }}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={[styles.panel, localStyles.panelPad].join(" ")}>
          {loading ? (
            <div className={styles.loadingState}>در حال بارگذاری...</div>
          ) : loadError ? (
            <div className={localStyles.emptyHint}>
              <p>{loadError}</p>
              <Button
                color="muted"
                label="تلاش دوباره"
                onClick={() => {
                  void loadItems();
                }}
              />
            </div>
          ) : items.length === 0 ? (
            <div className={localStyles.emptyHint}>
              <EmptyPage className={styles.emptyPage} />
              <p>اعلانی برای نمایش نیست.</p>
            </div>
          ) : (
            <ul className={localStyles.list}>
              {items.map(item => {
                const seen = isSeen(item);
                return (
                  <li
                    key={item.id}
                    className={[
                      localStyles.card,
                      seen ? localStyles.cardSeen : localStyles.cardUnread
                    ].join(" ")}
                  >
                    <div className={localStyles.cardMain}>
                      <img
                        src={item.image?.trim() || SAYBAN_LOGO_SRC}
                        alt={SAYBAN_APP_SHORT_NAME}
                        className={localStyles.thumb}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className={localStyles.cardBody}>
                        <div className={localStyles.cardTitleRow}>
                          <h3 className={localStyles.cardTitle}>{item.title}</h3>
                          {!seen ? (
                            <span className={localStyles.dot} aria-label="خوانده‌نشده" />
                          ) : null}
                        </div>
                        <p className={localStyles.cardText}>{item.text}</p>
                        <div className={localStyles.meta}>
                          {item.notification_type ? (
                            <span>{item.notification_type}</span>
                          ) : null}
                          {item.created_at ? (
                            <span>{formatWhen(item.created_at)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className={localStyles.cardActions}>
                      {!seen ? (
                        <Button
                          color="muted"
                          size="small"
                          loading={busyId === item.id}
                          disabel={busyId === item.id}
                          label="خواندم"
                          onClick={() => {
                            void markSeen(item);
                          }}
                        />
                      ) : null}
                      {item.action?.trim() ? (
                        <Button
                          color="success"
                          size="small"
                          loading={busyId === item.id}
                          disabel={busyId === item.id}
                          label="مشاهده"
                          onClick={() => {
                            void openAction(item);
                          }}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainPageNotifications;
