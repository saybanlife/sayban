import * as React from "react";
import { useRouter } from "next/router";
import Header from "./Header";
import { goBackOrReplace } from "./navigation/backNavigation";
import { readCachedReminderDetail, requestReminderEdit } from "@/lib/reminderTask";
import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";
import styles from "./ReminderDetailPage.module.css";

type Props = {
  /** Route mode (Homepage) — loads by id from cache / API. */
  reminderId?: string;
  onBack?: () => void;
  /** Dev-preview overlay mode (CustomEvent). */
  open?: boolean;
  reminder?: Record<string, unknown> | null;
  onClose?: () => void;
};

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : "";
}

function findInList(payload: unknown, reminderId: string): Record<string, unknown> | null {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? Array.isArray((payload as { reminders?: unknown }).reminders)
        ? (payload as { reminders: unknown[] }).reminders
        : Array.isArray((payload as { data?: unknown }).data)
          ? (payload as { data: unknown[] }).data
          : []
      : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (String((row as { id?: unknown }).id ?? "").trim() === reminderId) {
      return row as Record<string, unknown>;
    }
  }
  return null;
}

const WEEKDAY_FA: Record<string, string> = {
  saturday: "شنبه",
  sunday: "یکشنبه",
  monday: "دوشنبه",
  tuesday: "سه‌شنبه",
  wednesday: "چهارشنبه",
  thursday: "پنجشنبه",
  friday: "جمعه"
};

function scheduleLabel(reminder: Record<string, unknown>): string {
  const type = asText(reminder.schedule_type);
  const weekdays = parseJsonArray(reminder.weekdays);
  if (type === "everyDay" || weekdays.length >= 7) return "هر روز";
  if (weekdays.length) {
    return weekdays.map(d => WEEKDAY_FA[d] || d).join("، ");
  }
  if (type === "everyYear") return "هر سال";
  if (type === "once") return "یک‌بار";
  return type || "—";
}

function channelList(reminder: Record<string, unknown>): string[] {
  const channels = parseJsonArray(reminder.channels ?? reminder.chanels);
  if (!channels.length) return ["اعلان"];
  return channels.map(c => {
    if (c === "notification" || c === "notif") return "اعلان";
    if (c === "sms") return "پیامک";
    if (c === "telegram") return "تلگرام";
    return c;
  });
}

function AlarmIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3 2 6" />
      <path d="m22 6-3-3" />
      <path d="M6 19l-2 2" />
      <path d="M18 19l2 2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

/**
 * Reminder detail — real Homepage page (`/{page}/reminder_{id}`), same pattern
 * as ReservationDetails. Dev preview may still pass `open` + `reminder`.
 */
export default function ReminderDetailPage({
  reminderId,
  onBack,
  open,
  reminder: reminderProp,
  onClose
}: Props) {
  const router = useRouter();
  const isRouteMode = Boolean(reminderId);
  const isOpen = isRouteMode ? true : Boolean(open && reminderProp);

  const [reminder, setReminder] = React.useState<Record<string, unknown> | null>(
    reminderProp ?? null
  );
  const [loading, setLoading] = React.useState(isRouteMode);
  const [error, setError] = React.useState<string | null>(null);

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "reminder";

  React.useEffect(() => {
    if (!isRouteMode) {
      setReminder(reminderProp ?? null);
      setLoading(false);
      setError(null);
      return;
    }
    if (!reminderId) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const cached = readCachedReminderDetail(reminderId!);
      if (cached && !cancelled) setReminder(cached);

      const token = readCookie("token");
      try {
        const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.reminders), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const found = findInList(data, reminderId!);
          if (found && !cancelled) {
            setReminder(found);
            setLoading(false);
            return;
          }
        }
        if (!cached && !cancelled) {
          setError("جزئیات این یادآوری پیدا نشد.");
        }
      } catch {
        if (!cached && !cancelled) setError("خطا در دریافت جزئیات یادآوری.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isRouteMode, reminderId, reminderProp]);

  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (onClose) {
      onClose();
      return;
    }
    goBackOrReplace(router, `/${pageBase}`);
  }, [onBack, onClose, router, pageBase]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleBack]);

  if (!isOpen) return null;

  const name =
    asText(reminder?.name) ||
    asText(reminder?.title) ||
    asText(reminder?.type_fa) ||
    "یادآوری";
  const times = parseJsonArray(reminder?.times);
  const companion =
    asText(reminder?.patient_name) || asText(reminder?.patientName);
  const relation =
    asText(reminder?.patient_relation) || asText(reminder?.patientRelation);
  const active =
    reminder?.active === 1 ||
    reminder?.active === true ||
    asText(reminder?.status) === "active";

  const channels = reminder ? channelList(reminder) : [];
  const heading = channels.join(" ");

  const rows: { label: string; value: string }[] = reminder
    ? [
        { label: "شناسه", value: asText(reminder.id) || reminderId || "—" },
        { label: "عنوان", value: name },
        { label: "نوع", value: asText(reminder.type) || asText(reminder.type_fa) || "—" },
        { label: "زمان", value: times.length ? times.join(" ، ") : "—" },
        { label: "تکرار", value: scheduleLabel(reminder) },
        { label: "ارسال", value: channels.join("، ") },
        {
          label: "همراه",
          value: companion
            ? relation
              ? `${companion} (${relation})`
              : companion
            : "خودم"
        },
        { label: "وضعیت", value: active ? "فعال" : "غیرفعال" }
      ]
    : [];

  return (
    <div
      className={styles.page}
      data-reminder-detail="1"
      role="region"
      aria-label="جزئیات یادآوری"
      dir="rtl"
    >
      <Header
        className={styles.header}
        slot="جزئیات یادآوری"
        search={false}
        runCode
        back={handleBack}
      />

      <div className={styles.body}>
        {loading ? (
          <div className={styles.state} role="status" aria-live="polite">
            در حال بارگذاری…
          </div>
        ) : error ? (
          <div className={styles.state} role="alert">
            {error}
          </div>
        ) : reminder ? (
          <div className={styles.card}>
            <div className={styles.head}>
              <span className={styles.iconCircle}>
                <AlarmIcon />
              </span>
              <div className={styles.headText}>
                <h2 className={styles.cardTitle}>{heading}</h2>
                <span
                  className={`${styles.badge} ${active ? styles.badgeOn : styles.badgeOff}`}
                >
                  {active ? "فعال" : "غیرفعال"}
                  <span className={styles.dot} />
                </span>
              </div>
            </div>

            <dl className={styles.facts}>
              {rows.map(row => (
                <div key={row.label} className={styles.fact}>
                  <dt className={styles.label}>{row.label}:</dt>
                  <dd className={styles.value}>{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  requestReminderEdit(reminder);
                  void router.push("/reminder/reminderSetting/");
                }}
              >
                <PencilIcon />
                ویرایش
              </button>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={handleBack}
              >
                بستن
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}