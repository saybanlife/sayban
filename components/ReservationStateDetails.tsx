import * as React from "react";
import { useRouter } from "next/router";

import NurseOffersList from "./NurseOffersList";
import {
  buildReservationSteps,
  canCancelReservation,
  effectiveReservationStatus,
  isPaymentDone,
  parseCancellationPolicy,
  parseInterviewOptions,
  reservationFlow,
  reservationPaymentStatusLabel,
  reservationStatusHint,
  visitStage,
  visitStatusHint,
  type ReservationRecord
} from "./reservation/reservationDetailsModel";
import {
  formatInterviewSlotDay,
  formatInterviewSlotRange
} from "./reservation/interviewSlots";
import {
  reservationDetailsUrl,
  reservationLifecycleUrl
} from "./reservation/reservationLifecycleApi";
import {
  buildVisitBookingRoute
} from "./centerNavigation";
import styles from "./ReservationStateDetails.module.css";

type Props = {
  reservation: ReservationRecord;
  token?: string;
  pageBase?: string;
  onPay: () => void;
  onChange: (reservation: ReservationRecord) => void;
};

const MODE_LABELS = { online: "آنلاین", home: "در منزل", center: "در مرکز" } as const;
const MODE_ICONS = { online: "📹", home: "🏠", center: "📍" } as const;

const NURSE_WAITING = new Set([
  "draft",
  "registered",
  "pending",
  "awaitingOffers",
  "awaitingSupport"
]);

function faDigits(value: string | number) {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

function faDate(value?: string | null, withTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  };
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", options).format(date);
}

function faDayMonth(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function faClock(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function faMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString("fa-IR")} تومان` : "";
}

function relativeWhen(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86400000
  );
  const clock = faClock(value);
  if (dayDiff === 0) return clock ? `امروز ${clock}` : "امروز";
  if (dayDiff === 1) return clock ? `دیروز ${clock}` : "دیروز";
  return faDayMonth(value);
}

function relativeServiceTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startThat.getTime() - startToday.getTime()) / 86400000
  );
  const clock = faClock(value);
  if (dayDiff === 0) return clock ? `امروز ساعت ${clock}` : "امروز";
  if (dayDiff === 1) return clock ? `فردا ساعت ${clock}` : "فردا";
  return faDate(value, true);
}

function daysLeftLabel(deadline?: string | null) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  const days = Math.ceil(ms / 86400000);
  if (days <= 0) return "امروز فرصت دارید";
  return `${faDigits(days)} روز فرصت دارید`;
}

function trialDaysCount(reservation: ReservationRecord) {
  if (!reservation.trial_start_at || !reservation.trial_end_at) return null;
  const a = new Date(reservation.trial_start_at).getTime();
  const b = new Date(reservation.trial_end_at).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.max(1, Math.round((b - a) / 86400000));
}

function trialPackageLabel(reservation: ReservationRecord) {
  const days = trialDaysCount(reservation);
  const hours = Number(reservation.trial_hours ?? reservation.shift_hours ?? 12);
  const dayPart = days
    ? `${faDigits(days)} روز آزمایشی`
    : "دو روز آزمایشی";
  if (Number.isFinite(hours) && hours > 0) {
    return `${dayPart} (${faDigits(hours)} ساعته)`;
  }
  return dayPart;
}

function offerDeadlineCopy(reservation: ReservationRecord) {
  const raw =
    (reservation.offers_deadline as string | undefined) ||
    (reservation.offer_deadline as string | undefined);
  if (raw) {
    const clock = faClock(raw);
    return clock
      ? `درخواست شما برای مراکز مرتبط فرستاده شد. تا ساعت ${clock} پیشنهاد می‌رسد.`
      : "درخواست شما برای مراکز مرتبط فرستاده شد.";
  }
  if (reservation.created_at) {
    const eta = new Date(reservation.created_at);
    if (!Number.isNaN(eta.getTime())) {
      eta.setHours(eta.getHours() + 2);
      const clock = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(eta);
      return `درخواست شما برای مراکز مرتبط فرستاده شد. تا ساعت ${clock} پیشنهاد می‌رسد.`;
    }
  }
  return "درخواست شما برای مراکز مرتبط فرستاده شد. به‌زودی پیشنهاد می‌رسد.";
}

function mapsUrl(reservation: ReservationRecord) {
  if (reservation.center_latitude && reservation.center_longitude) {
    return `https://www.google.com/maps?q=${reservation.center_latitude},${reservation.center_longitude}`;
  }
  const q = [reservation.center_name, reservation.center_city, reservation.center_address]
    .filter(Boolean)
    .join(" ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

function InfoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.notice}>
      <span aria-hidden="true">ⓘ</span>
      <span>{children}</span>
    </div>
  );
}

function Timeline({ reservation }: { reservation: ReservationRecord }) {
  const steps = buildReservationSteps(reservation);
  return (
    <div
      className={`${styles.timeline} ${
        steps.length <= 3 ? styles.timelineCompact : ""
      }`}
      role="list"
      aria-label="مراحل رزرو"
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          {index ? (
            <span
              className={`${styles.line} ${
                steps[index - 1].done ? styles.lineDone : ""
              }`}
            />
          ) : null}
          <div
            className={`${styles.step} ${step.done ? styles.done : ""} ${
              step.current ? styles.current : ""
            }`}
            role="listitem"
          >
            <span className={styles.dot}>
              {step.done && !step.current
                ? "✓"
                : faDigits(index + 1)}
            </span>
            <span>{step.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function PreviousSteps({
  items
}: {
  items: Array<{ label: string; when?: string }>;
}) {
  if (!items.length) return null;
  return (
    <section className={styles.prevBlock} aria-label="مراحل قبلی">
      <h3 className={styles.prevTitle}>مراحل قبلی</h3>
      <ul className={styles.prevList}>
        {items.map(item => (
          <li key={`${item.label}-${item.when || ""}`} className={styles.prevItem}>
            <span className={styles.prevLabel}>
              <span className={styles.check} aria-hidden="true">
                ✓
              </span>
              {item.label}
            </span>
            {item.when ? <span className={styles.prevWhen}>{item.when}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SummaryAccordion({
  rows
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  const [open, setOpen] = React.useState(false);
  if (!rows.length) return null;
  return (
    <section className={styles.summary}>
      <button
        type="button"
        className={styles.summaryToggle}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span>خلاصه درخواست</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className={styles.summaryBody}>
          <div className={styles.dataBox}>
            {rows.map(row => (
              <div key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CancellationBlock({
  cancellation
}: {
  cancellation: {
    full_refund_before_hours?: number;
    partial_refund_before_hours?: number;
    partial_refund_percent?: number;
  } | null;
}) {
  if (!cancellation) return null;
  const full = cancellation.full_refund_before_hours;
  const partial = cancellation.partial_refund_before_hours;
  const percent = cancellation.partial_refund_percent;
  return (
    <section className={styles.policy}>
      <strong>اگر لغو کنید:</strong>
      {full != null ? (
        <span>
          بیش از {faDigits(full)} ساعت مانده: بازگشت کامل
        </span>
      ) : null}
      {partial != null && percent != null ? (
        <span>
          بین {faDigits(partial)} تا {faDigits(full ?? partial)} ساعت:{" "}
          {percent === 50 ? "نصف مبلغ" : `بازگشت ${faDigits(percent)}٪`}
        </span>
      ) : null}
      {partial != null ? (
        <span>کمتر از {faDigits(partial)} ساعت: بدون بازگشت</span>
      ) : null}
    </section>
  );
}

export default function ReservationStateDetails({
  reservation,
  token,
  pageBase = "home",
  onPay,
  onChange
}: Props) {
  const router = useRouter();
  const flow = reservationFlow(reservation);
  const status = effectiveReservationStatus(reservation);
  const rawStatus = String(reservation.status || "");
  const canCancel = canCancelReservation(reservation);
  const showServicePay =
    flow === "service" &&
    !isPaymentDone(reservation) &&
    (rawStatus === "awaitingPayment" || rawStatus === "nurseSelected");
  /** Nurse rows that already selected a staff but never finished gateway pay. */
  const showNursePay =
    flow === "nurse" &&
    !isPaymentDone(reservation) &&
    (rawStatus === "awaitingPayment" ||
      rawStatus === "nurseSelected" ||
      status === "trial_payment");
  const visitRescheduleHref = (() => {
    const publicId = String(
      reservation.center_public_id || reservation.center_id || ""
    ).trim();
    if (!publicId) return `/${pageBase}/booking`;
    return (
      buildVisitBookingRoute(pageBase, publicId) || `/${pageBase}/booking`
    );
  })();
  const editRequestHref = `/${pageBase}/booking`;
  const interviewOptions = parseInterviewOptions(reservation.interview_options);
  const cancellation =
    parseCancellationPolicy(reservation.cancellation_policy) ||
    (flow === "service"
      ? {
          full_refund_before_hours: 12,
          partial_refund_before_hours: 4,
          partial_refund_percent: 50
        }
      : null);
  const [selectedInterview, setSelectedInterview] = React.useState(
    interviewOptions[0]?.starts_at || ""
  );
  const [selectedMode, setSelectedMode] = React.useState<"online" | "home" | "center">(
    interviewOptions[0]?.modes?.[0] || "online"
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!interviewOptions.length) return;
    const stillValid = interviewOptions.some(
      option => option.starts_at === selectedInterview
    );
    if (!stillValid) {
      setSelectedInterview(interviewOptions[0]!.starts_at);
      setSelectedMode(interviewOptions[0]!.modes?.[0] || "online");
    }
  }, [interviewOptions, selectedInterview]);

  const refresh = async () => {
    if (!reservation.id) return;
    const response = await fetch(reservationDetailsUrl(reservation.id), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store"
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.result) onChange(payload.result as ReservationRecord);
  };

  const act = async (body: Record<string, unknown>) => {
    if (!reservation.id || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(reservationLifecycleUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...body, reservation_id: reservation.id })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        const message = String(
          payload?.message || payload?.error || payload?.errorMessage || ""
        ).trim();
        // Prefer upstream message (incl. n8n 409 JSON); empty body → generic.
        throw new Error(message || "action-failed");
      }
      if (payload.result) onChange(payload.result as ReservationRecord);
      else await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message && message !== "action-failed"
          ? message
          : "انجام این عملیات ممکن نشد. دوباره تلاش کنید."
      );
    } finally {
      setBusy(false);
    }
  };

  const centerAddress = [reservation.center_city, reservation.center_address]
    .filter(Boolean)
    .join("، ");
  const staffName = reservation.staff_name || reservation.staff?.name || "";
  const staffRating =
    reservation.staff_rating ?? reservation.staff?.rating ?? reservation.rating;
  const serviceTime = faDate(reservation.start_time, true);
  const trialStart = faDate(reservation.trial_start_at, true);
  const isVisit = flow === "visit";
  const stage = isVisit ? visitStage(reservation) : null;
  const mapHref = mapsUrl(reservation);

  const showWaiting = flow === "nurse" && NURSE_WAITING.has(status);
  const showOffers = flow === "nurse" && status === "offersReceived";
  const showInterview =
    flow === "nurse" &&
    interviewOptions.length > 0 &&
    !reservation.interview_at &&
    !showWaiting &&
    !showOffers;
  const showInterviewWaiting =
    flow === "nurse" &&
    ["nurseSelected", "awaitingPayment"].includes(status) &&
    !showInterview;
  const showTrialPayment = flow === "nurse" && status === "trial_payment";
  const showTrialAttendance = flow === "nurse" && status === "trial_in_progress";
  const showTrialDecision = flow === "nurse" && status === "trial_decision";
  const showContract = flow === "nurse" && status === "awaiting_contract";
  const showNurseSummary =
    flow === "nurse" &&
    !showWaiting &&
    !showOffers &&
    !showInterview &&
    !showInterviewWaiting &&
    !showTrialPayment &&
    !showTrialAttendance &&
    !showTrialDecision &&
    !showContract;

  const previousItems = React.useMemo(() => {
    const items: Array<{ label: string; when?: string }> = [];
    if (reservation.created_at) {
      items.push({
        label: "درخواست ثبت شد.",
        when: relativeWhen(reservation.created_at)
      });
    }
    if (
      flow === "nurse" &&
      staffName &&
      !NURSE_WAITING.has(status) &&
      status !== "offersReceived"
    ) {
      items.push({
        label: `${staffName} انتخاب شد.`,
        when: faDayMonth(reservation.interview_at || reservation.start_time)
      });
    }
    if (reservation.interview_at) {
      items.push({
        label: "مصاحبه انجام شد.",
        when: relativeWhen(reservation.interview_at)
      });
    }
    if (
      showTrialAttendance ||
      showTrialDecision ||
      showContract ||
      status === "contract_closed"
    ) {
      items.push({
        label: "روز اول آزمایشی",
        when:
          reservation.trial_attendance_user != null
            ? "دیروز"
            : faDayMonth(reservation.trial_start_at)
      });
    }
    return items;
  }, [
    flow,
    reservation.created_at,
    reservation.interview_at,
    reservation.start_time,
    reservation.trial_attendance_user,
    reservation.trial_start_at,
    showContract,
    showTrialAttendance,
    showTrialDecision,
    staffName,
    status
  ]);

  const summaryRows = [
    {
      label: "خدمت",
      value:
        flow === "nurse"
          ? "مراقب مداوم"
          : reservation.service_name || (isVisit ? "بازدید" : "—")
    },
    {
      label: "مرکز",
      value: reservation.center_name || "در حال انتخاب"
    },
    {
      label: "پرداخت",
      value: reservationPaymentStatusLabel(reservation)
    },
    reservation.user?.name
      ? { label: "گیرنده خدمت", value: reservation.user.name }
      : null,
    serviceTime ? { label: "زمان", value: serviceTime } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const trialDayTitle =
    reservation.trial_attendance_user != null
      ? `روز دوم آزمایشی با ${staffName || "پرستار"}`
      : `روز آزمایشی با ${staffName || "پرستار"}`;

  const contractDeadline = daysLeftLabel(reservation.contract_deadline);

  return (
    <main className={styles.root}>
      <Timeline reservation={reservation} />

      {showWaiting ? (
        <section className={styles.card}>
          <span className={styles.badgeNow}>الان</span>
          <h2>در انتظار پیشنهاد مراکز</h2>
          <p>{offerDeadlineCopy(reservation)}</p>
          <div className={styles.metaBar}>
            <span aria-hidden="true">◷</span>
            <span>۰ پیشنهاد تا الان</span>
          </div>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => void router.push(editRequestHref)}
            >
              ویرایش درخواست
            </button>
            {canCancel ? (
              <button
                type="button"
                className={styles.secondary}
                disabled={busy}
                onClick={() => act({ action: "cancel_request" })}
              >
                لغو درخواست
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {showOffers && reservation.id ? (
        <NurseOffersList
          compact
          reservationId={String(reservation.id)}
          token={token}
          onSelected={paymentId => {
            void refresh().finally(() => {
              if (!paymentId) return;
              window.sessionStorage.setItem("payId", String(paymentId));
              void router.push(`/${pageBase}/pay_${paymentId}`);
            });
          }}
        />
      ) : null}

      {showInterviewWaiting ? (
        <section className={`${styles.card} ${styles.actionCard}`}>
          <span className={styles.badgeNow}>الان</span>
          <h2>
            {showNursePay
              ? "پرداخت و هماهنگی مصاحبه"
              : "در انتظار هماهنگی مصاحبه"}
          </h2>
          <p>
            {showNursePay
              ? "برای ادامه، هزینه را پرداخت کنید. پس از ثبت زمان‌های پیشنهادی مرکز، انتخاب مصاحبه هم در همین صفحه فعال می‌شود."
              : "پس از ثبت زمان‌های پیشنهادی مرکز، امکان انتخاب زمان مصاحبه در همین صفحه نمایش داده می‌شود."}
          </p>
          <div className={styles.dataBox}>
            {staffName ? (
              <div>
                <span>پرستار انتخاب‌شده</span>
                <strong>{staffName}</strong>
              </div>
            ) : null}
            {reservation.center_name ? (
              <div>
                <span>مرکز</span>
                <strong>{reservation.center_name}</strong>
              </div>
            ) : null}
            {reservation.final_price != null ? (
              <div>
                <span>{reservationPaymentStatusLabel(reservation)}</span>
                <strong>{faMoney(reservation.final_price)}</strong>
              </div>
            ) : null}
          </div>
          {showNursePay ? (
            <button type="button" className={styles.primary} onClick={onPay}>
              پرداخت از درگاه
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              className={styles.ghostWide}
              disabled={busy}
              onClick={() => act({ action: "cancel_request" })}
            >
              لغو درخواست
            </button>
          ) : null}
        </section>
      ) : null}

      {showInterview ? (
        <section className={`${styles.card} ${styles.actionCard}`}>
          <span className={styles.badgeAction}>اقدام شما</span>
          <h2>زمان مصاحبه با {staffName || "پرستار"}</h2>
          <p>
            {reservation.center_name
              ? `${reservation.center_name} ${faDigits(interviewOptions.length)} زمان پیشنهاد کرده است:`
              : "مرکز زمان‌های زیر را برای مصاحبه پیشنهاد کرده است:"}
          </p>
          <div className={styles.choices} role="radiogroup" aria-label="زمان مصاحبه">
            {interviewOptions.map(option => {
              const selected = selectedInterview === option.starts_at;
              return (
                <label
                  key={option.starts_at}
                  className={selected ? styles.choiceSelected : styles.choice}
                >
                  <input
                    type="radio"
                    name="interview"
                    value={option.starts_at}
                    checked={selected}
                    onChange={() => {
                      setSelectedInterview(option.starts_at);
                      if (
                        option.modes?.length &&
                        !option.modes.includes(selectedMode)
                      ) {
                        setSelectedMode(option.modes[0]);
                      }
                    }}
                  />
                  <span className={styles.choiceDay}>
                    {formatInterviewSlotDay(option.starts_at)}
                  </span>
                  <span className={styles.choiceTime}>
                    {formatInterviewSlotRange(option.starts_at, option.ends_at)}
                  </span>
                </label>
              );
            })}
          </div>
          <p className={styles.question}>مصاحبه چطور باشد؟</p>
          <div className={styles.modeGrid}>
            {(
              interviewOptions.find(item => item.starts_at === selectedInterview)
                ?.modes || ["online", "home", "center"]
            ).map(mode => (
              <button
                key={mode}
                type="button"
                className={
                  selectedMode === mode ? styles.modeSelected : styles.mode
                }
                onClick={() => setSelectedMode(mode)}
              >
                <span className={styles.modeIcon} aria-hidden="true">
                  {MODE_ICONS[mode]}
                </span>
                <span>{MODE_LABELS[mode]}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.primary}
            disabled={busy || !selectedInterview}
            onClick={() =>
              act({
                action: "select_interview",
                interviewAt: selectedInterview,
                interviewMode: selectedMode
              })
            }
          >
            تأیید زمان مصاحبه ✓
          </button>
          <p className={styles.footerNote}>
            <span aria-hidden="true">ℹ</span>
            مرکز زمان را تأیید می‌کند و پیامک یادآوری می‌فرستد.
          </p>
        </section>
      ) : null}

      {showTrialPayment && !showInterviewWaiting ? (
        <section className={`${styles.card} ${styles.actionCard}`}>
          <span className={styles.badgeAction}>اقدام شما</span>
          <h2>پرداخت هزینه دو روز آزمایشی</h2>
          <p>
            مصاحبه با {staffName || "پرستار"} انجام شد. برای شروع دو روز
            آزمایشی، هزینه را به سایبان پرداخت کنید.
          </p>
          <div className={styles.dataBox}>
            <div>
              <span>{trialPackageLabel(reservation)}</span>
              <strong>
                {faMoney(reservation.trial_total_price) || "—"}
              </strong>
            </div>
            {trialStart ? (
              <div>
                <span>شروع</span>
                <strong>{trialStart}</strong>
              </div>
            ) : null}
          </div>
          {showNursePay ? (
            <button type="button" className={styles.primary} onClick={onPay}>
              پرداخت از درگاه
            </button>
          ) : null}
          <div className={styles.noticeList} style={{ marginTop: 12 }}>
            <InfoNotice>
              اگر نیرو نیامد، هزینه آن روز به شما برمی‌گردد.
            </InfoNotice>
            <InfoNotice>
              اگر بعد از آزمایشی ادامه بدهید، قرارداد را خودتان در مرکز
              می‌بندید.
            </InfoNotice>
          </div>
        </section>
      ) : null}

      {showTrialAttendance ? (
        <>
          <section className={`${styles.card} ${styles.actionCard}`}>
            <span className={styles.badgeAction}>اقدام شما</span>
            <h2>{trialDayTitle}</h2>
            <p>
              {reservation.trial_start_at
                ? `امروز از ساعت ${faClock(reservation.trial_start_at) || "۸ صبح"}`
                : "امروز"}
            </p>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.secondary}
                disabled={busy}
                onClick={() =>
                  act({ action: "report_attendance", attended: false })
                }
              >
                نرسید
              </button>
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={() =>
                  act({ action: "report_attendance", attended: true })
                }
              >
                ✓ رسید
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <InfoNotice>
                چرا می‌پرسیم؟ تا وقت‌شناسی و نظم {staffName || "نیرو"} در
                امتیازش ثبت شود و برای همه کاربران قابل اعتماد باشد.
              </InfoNotice>
            </div>
          </section>
          <PreviousSteps items={previousItems} />
        </>
      ) : null}

      {showTrialDecision ? (
        <section className={`${styles.card} ${styles.actionCard}`}>
          <span className={styles.badgeAction}>اقدام شما</span>
          <h2>تصمیم شما چیست؟</h2>
          <p>روزهای آزمایشی با {staffName || "پرستار"} تمام شد.</p>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => act({ action: "trial_decision", decision: "stop" })}
            >
              ادامه نمی‌دهم
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() =>
                act({ action: "trial_decision", decision: "continue" })
              }
            >
              ادامه با {staffName || "پرستار"}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <InfoNotice>
              اگر ادامه ندهید، دلیلش را می‌پرسیم تا نیروی مناسب‌تری معرفی شود و
              کیفیت خدمت حفظ شود.
            </InfoNotice>
          </div>
        </section>
      ) : null}

      {showContract ? (
        <section className={`${styles.card} ${styles.actionCard}`}>
          <span className={styles.badgeAction}>اقدام شما</span>
          <div className={styles.titleRow}>
            <h2>وقت بستن قرارداد</h2>
            {contractDeadline ? (
              <span className={styles.deadlinePill}>
                ◷ {contractDeadline}
              </span>
            ) : null}
          </div>
          <p>
            با {reservation.center_name || "مرکز"} هماهنگ کنید. قرارداد در خود
            مرکز بسته می‌شود.
          </p>
          <div className={styles.dataBox}>
            {reservation.center_name ? (
              <div>
                <span>مرکز</span>
                <strong>{reservation.center_name}</strong>
              </div>
            ) : null}
            {reservation.center_phone ? (
              <div>
                <span>تلفن</span>
                <strong dir="ltr">{reservation.center_phone}</strong>
              </div>
            ) : null}
            {centerAddress ? (
              <div>
                <span>آدرس</span>
                <strong>{centerAddress}</strong>
              </div>
            ) : null}
          </div>
          <div className={styles.actionRow}>
            {mapHref ? (
              <a
                className={styles.secondary}
                href={mapHref}
                target="_blank"
                rel="noreferrer"
              >
                مسیر مرکز
              </a>
            ) : null}
            {reservation.center_phone ? (
              <a
                className={styles.primary}
                href={`tel:${reservation.center_phone}`}
              >
                ☎ تماس با مرکز
              </a>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.ghostWide}
            disabled={busy}
            onClick={() => act({ action: "close_contract" })}
          >
            <span className={styles.check} aria-hidden="true">
              ✓
            </span>
            قرارداد بسته شد
          </button>
          <div style={{ marginTop: 12 }}>
            <InfoNotice>
              با اطلاع دادن به ما، می‌توانیم کیفیت خدمت را پایش کنیم و
              ضمانت‌های سایبان را برای شما فعال کنیم.
            </InfoNotice>
          </div>
        </section>
      ) : null}

      {showNurseSummary ? (
        <section className={styles.card}>
          <span className={styles.badgeNow}>الان</span>
          <h2>{reservationStatusHint(String(reservation.status))}</h2>
          <div className={styles.dataBox}>
            {staffName ? (
              <div>
                <span>پرستار</span>
                <strong>{staffName}</strong>
              </div>
            ) : null}
            {reservation.center_name ? (
              <div>
                <span>مرکز</span>
                <strong>{reservation.center_name}</strong>
              </div>
            ) : null}
            {serviceTime ? (
              <div>
                <span>زمان</span>
                <strong>{serviceTime}</strong>
              </div>
            ) : null}
            {reservation.final_price != null ? (
              <div>
                <span>{reservationPaymentStatusLabel(reservation)}</span>
                <strong>{faMoney(reservation.final_price)}</strong>
              </div>
            ) : null}
          </div>
          {reservation.center_phone ? (
            <a
              className={styles.secondaryWide}
              href={`tel:${reservation.center_phone}`}
            >
              تماس با مرکز
            </a>
          ) : null}
        </section>
      ) : null}

      {isVisit ? (
        <section
          className={`${styles.card} ${
            stage === "visitScheduled" ? styles.actionCard : ""
          }`}
        >
          {stage === "awaitingCenter" ? (
            <>
              <span className={styles.badgeNow}>الان</span>
              <h2>منتظر تأیید مرکز</h2>
              <p>
                وقت بازدید شما ثبت شد
                {serviceTime ? `: ${serviceTime}` : "."} مرکز به‌زودی تأیید
                می‌کند.
              </p>
            </>
          ) : null}
          {stage === "visitScheduled" ? (
            <>
              <span className={styles.badgeAction}>بازدید شما</span>
              <h2>بازدید از {reservation.center_name || "مرکز"}</h2>
              {serviceTime ? <p>{serviceTime}</p> : null}
            </>
          ) : null}
          {stage === "visitDone" ? (
            <>
              <span className={styles.badgeNow}>انجام شد</span>
              <h2>بازدید انجام شد</h2>
              {serviceTime ? <p>{serviceTime}</p> : null}
            </>
          ) : null}
          {stage === "cancelled" ? (
            <h2>{visitStatusHint(String(reservation.status))}</h2>
          ) : null}

          <div className={styles.dataBox}>
            {reservation.center_name ? (
              <div>
                <span>مرکز</span>
                <strong>{reservation.center_name}</strong>
              </div>
            ) : null}
            {reservation.center_phone && stage !== "cancelled" ? (
              <div>
                <span>تلفن</span>
                <strong dir="ltr">{reservation.center_phone}</strong>
              </div>
            ) : null}
            {stage === "visitScheduled" && centerAddress ? (
              <div>
                <span>آدرس</span>
                <strong>{centerAddress}</strong>
              </div>
            ) : null}
          </div>

          {stage === "awaitingCenter" || stage === "visitScheduled" ? (
            <>
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => void router.push(visitRescheduleHref)}
                >
                  تغییر وقت
                </button>
                {reservation.center_phone ? (
                  <a
                    className={styles.secondary}
                    href={`tel:${reservation.center_phone}`}
                  >
                    ☎ تماس با مرکز
                  </a>
                ) : null}
              </div>
              {(stage === "awaitingCenter" || stage === "visitScheduled") &&
              canCancel ? (
                <button
                  type="button"
                  className={styles.danger}
                  disabled={busy}
                  onClick={() => act({ action: "cancel_request" })}
                >
                  {stage === "visitScheduled" ? "لغو بازدید" : "حذف وقت"}
                </button>
              ) : null}
              {stage === "visitScheduled" && mapHref ? (
                <a
                  className={styles.secondaryWide}
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  مسیر مرکز
                </a>
              ) : null}
            </>
          ) : null}

          {stage === "awaitingCenter" ? (
            <div style={{ marginTop: 12 }}>
              <InfoNotice>
                شماره مرکز بعد از ثبت درخواست نمایش داده می‌شود. هماهنگی‌های
                بعدی را خودتان با مرکز انجام می‌دهید.
              </InfoNotice>
            </div>
          ) : null}
        </section>
      ) : null}

      {flow === "service" ? (
        <>
          <section className={styles.card}>
            <span className={styles.badgeNow}>الان</span>
            <h2>
              {staffName && reservation.start_time
                ? `${staffName} ${relativeServiceTime(reservation.start_time)} می‌آید`
                : reservation.service_name || "جزئیات خدمت"}
            </h2>
            {!staffName ? (
              <p>{reservationStatusHint(String(reservation.status))}</p>
            ) : null}

            {staffName ? (
              <div className={styles.staffHero}>
                <div className={styles.avatar} aria-hidden="true">
                  {String(staffName).trim().charAt(0) || "؟"}
                </div>
                <div className={styles.staffMeta}>
                  <p className={styles.staffName}>
                    {staffName}
                    {reservation.center_name
                      ? ` - ${reservation.center_name}`
                      : ""}
                  </p>
                  <p className={styles.staffSub}>
                    {[reservation.service_name, reservation.user?.name]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                  {staffRating != null && staffRating !== "" ? (
                    <span className={styles.rating}>
                      ★ {faDigits(Number(staffRating).toFixed(1))}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={styles.dataBox}>
              {serviceTime ? (
                <div>
                  <span>زمان</span>
                  <strong>
                    {relativeServiceTime(reservation.start_time) || serviceTime}
                  </strong>
                </div>
              ) : null}
              {reservation.final_price != null ? (
                <div>
                  <span>{reservationPaymentStatusLabel(reservation)}</span>
                  <strong>{faMoney(reservation.final_price)}</strong>
                </div>
              ) : null}
            </div>

            {showServicePay ? (
              <button
                type="button"
                className={styles.primary}
                onClick={onPay}
              >
                پرداخت
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                className={styles.ghostWide}
                disabled={busy}
                onClick={() => act({ action: "cancel_request" })}
              >
                لغو خدمت
              </button>
            ) : null}
          </section>

          <CancellationBlock cancellation={cancellation} />

          <InfoNotice>
            در روز خدمت از شما می‌پرسیم نیرو رسید یا نه، تا نظم او در امتیازش
            ثبت شود.
          </InfoNotice>
        </>
      ) : null}

      {showWaiting ? (
        <>
          <PreviousSteps items={previousItems} />
          <SummaryAccordion rows={summaryRows} />
          <InfoNotice>لغو درخواست قبل از انتخاب نیرو رایگان است.</InfoNotice>
        </>
      ) : null}

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      {flow === "nurse" &&
      !showWaiting &&
      !showTrialPayment &&
      !showTrialAttendance &&
      !showTrialDecision &&
      !showContract &&
      cancellation ? (
        <CancellationBlock cancellation={cancellation} />
      ) : null}
    </main>
  );
}
