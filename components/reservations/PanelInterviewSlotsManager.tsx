import * as React from "react";

import DateField from "../datetime/DateField";
import TimeField from "../datetime/TimeField";
import {
  formatInterviewSlotDay,
  formatInterviewSlotRange,
  interviewOptionsToDrafts,
  newSlotDraft,
  type InterviewSlotDraft
} from "../reservation/interviewSlots";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import { panelViewerFromToken } from "./sanitizePanelReservation";
import styles from "./PanelInterviewSlotsManager.module.css";

type Props = {
  reservationId: string | number;
  centerId?: string | number | null;
  staffId?: string | number | null;
  /** When false, hide for non-nurse rows. */
  enabled?: boolean;
};

type LoadedState = {
  drafts: InterviewSlotDraft[];
  interviewAt?: string | null;
  interviewMode?: string | null;
  staffName?: string;
  interviewOptions?: Array<{ starts_at: string; ends_at?: string }>;
};

const MODE_LABELS: Record<string, string> = {
  online: "آنلاین",
  home: "در منزل",
  center: "در مرکز"
};

function authHeader() {
  const token = readCookie(PANEL_AUTH_COOKIE_NAME);
  return token ? `Bearer ${token}` : "";
}

export default function PanelInterviewSlotsManager({
  reservationId,
  centerId,
  staffId,
  enabled = true
}: Props) {
  const viewer = React.useMemo(
    () => panelViewerFromToken(readCookie(PANEL_AUTH_COOKIE_NAME)),
    []
  );
  const resolvedCenterId =
    Number(centerId) > 0
      ? Number(centerId)
      : viewer.centerId && viewer.centerId > 0
        ? viewer.centerId
        : null;
  const [drafts, setDrafts] = React.useState<InterviewSlotDraft[]>([
    newSlotDraft()
  ]);
  const [interviewAt, setInterviewAt] = React.useState<string | null>(null);
  const [interviewMode, setInterviewMode] = React.useState<string | null>(null);
  const [staffName, setStaffName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    if (!enabled || !reservationId || !resolvedCenterId) return;
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/panel/interview-slots", window.location.origin);
      url.searchParams.set("reservationId", String(reservationId));
      url.searchParams.set("centerId", String(resolvedCenterId));
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          ...(authHeader() ? { Authorization: authHeader() } : {})
        },
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "load-failed");
      }
      const result = payload.result as LoadedState;
      setDrafts(
        result.drafts?.length
          ? result.drafts
          : interviewOptionsToDrafts(result.interviewOptions || [])
      );
      setInterviewAt(result.interviewAt || null);
      setInterviewMode(result.interviewMode || null);
      setStaffName(result.staffName || "");
    } catch {
      setError("بارگذاری زمان‌های مصاحبه ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [enabled, reservationId, resolvedCenterId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!enabled || !reservationId || !resolvedCenterId) return null;

  const updateDraft = (id: string, patch: Partial<InterviewSlotDraft>) => {
    setDrafts(current =>
      current.map(item => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const addDraft = () => {
    setDrafts(current => [...current, newSlotDraft()]);
  };

  const removeDraft = (id: string) => {
    setDrafts(current =>
      current.length <= 1 ? current : current.filter(item => item.id !== id)
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/panel/interview-slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(authHeader() ? { Authorization: authHeader() } : {})
        },
        body: JSON.stringify({
          reservationId: Number(reservationId),
          centerId: resolvedCenterId,
          staffId: staffId != null && Number(staffId) > 0 ? Number(staffId) : undefined,
          slots: drafts
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "save-failed");
      }
      const result = payload.result as LoadedState;
      setDrafts(
        result.drafts?.length ? result.drafts : [newSlotDraft()]
      );
      setInterviewAt(result.interviewAt || null);
      setInterviewMode(result.interviewMode || null);
      setStaffName(result.staffName || "");
      setMessage("زمان‌های پیشنهادی مصاحبه ذخیره شد.");
    } catch {
      setError("ذخیره زمان‌های مصاحبه انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.root} aria-label="زمان‌های پیشنهادی مصاحبه">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>زمان‌های پیشنهادی مصاحبه</h3>
          <p className={styles.hint}>
            برای این پرستار چند تاریخ و ساعت پیشنهاد دهید. کاربر فقط یکی را
            انتخاب می‌کند.
            {staffName ? ` (${staffName})` : ""}
          </p>
        </div>
      </div>

      {loading ? <div className={styles.muted}>در حال بارگذاری…</div> : null}

      <div className={styles.list}>
        {drafts.map((draft, index) => (
          <div key={draft.id} className={styles.row}>
            <span className={styles.index}>{index + 1}</span>
            <div className={styles.fields}>
              <DateField
                label="تاریخ"
                value={draft.date}
                onChange={value => updateDraft(draft.id, { date: value })}
                disablePastDates
              />
              <TimeField
                label="ساعت شروع"
                value={draft.time}
                onChange={value => updateDraft(draft.id, { time: value })}
                minuteStep={5}
              />
            </div>
            <button
              type="button"
              className={styles.remove}
              onClick={() => removeDraft(draft.id)}
              disabled={drafts.length <= 1 || saving}
              aria-label="حذف این زمان"
            >
              حذف
            </button>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={addDraft}
          disabled={saving}
        >
          + افزودن زمان
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => void save()}
          disabled={saving || loading}
        >
          {saving ? "در حال ذخیره…" : "ذخیره زمان‌های مصاحبه"}
        </button>
      </div>

      {interviewAt ? (
        <div className={styles.selectedBox}>
          <strong>انتخاب کاربر</strong>
          <span>
            {formatInterviewSlotDay(interviewAt)}
            {" · "}
            {formatInterviewSlotRange(interviewAt)}
            {interviewMode
              ? ` · ${MODE_LABELS[interviewMode] || interviewMode}`
              : ""}
          </span>
        </div>
      ) : drafts.some(item => item.date && item.time) ? (
        <div className={styles.waitingBox}>
          هنوز کاربر زمانی را انتخاب نکرده است.
        </div>
      ) : null}

      {message ? <div className={styles.ok}>{message}</div> : null}
      {error ? (
        <div className={styles.err} role="alert">
          {error}
        </div>
      ) : null}
    </section>
  );
}
