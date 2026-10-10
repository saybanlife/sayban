import {
  buildReservationSteps,
  effectiveReservationStatus,
  parseInterviewOptions,
  reservationFlow,
  reservationStatusHint,
  reservationStepCaption,
  visitStage,
  type ReservationRecord,
  type ReservationStep
} from "../reservation/reservationDetailsModel";
import { bookingTabForReservation } from "../reservation/bookingTabs";

export type HomeStatusBadgeTone = "action" | "info" | "success";

export type HomeStatusAction =
  | {
      kind: "link" | "primary" | "outlined";
      label: string;
      target:
        | "details"
        | "offers"
        | "pay"
        | "call_center"
        | "select_interview"
        | "center_review"
        | "support_callback";
      icon?: "clock" | "phone" | "chevron";
    }
  | {
      kind: "split";
      left: {
        label: string;
        action: "report_missed" | "trial_stop" | "visit_contract_no";
      };
      right: {
        label: string;
        action:
          | "report_attended"
          | "trial_continue"
          | "visit_contract_yes";
        checkmark?: boolean;
      };
    };

export type HomeStatusCardModel = {
  contextLabel: string;
  badge: { label: string; tone: HomeStatusBadgeTone };
  title: string;
  subtitle: string;
  highlight?: string;
  notice?: string;
  steps: ReservationStep[];
  stepCaption: string;
  needsAction: boolean;
  staffInitial?: string;
  actions: HomeStatusAction[];
};

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

function faClock(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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

function staffName(reservation: ReservationRecord) {
  return String(reservation.staff_name || reservation.staff?.name || "").trim();
}

function recipientName(reservation: ReservationRecord) {
  return String(
    reservation.user?.name ||
      reservation.patient_name ||
      reservation.elderly_name ||
      ""
  ).trim();
}

function offersCount(reservation: ReservationRecord): number | null {
  const raw =
    reservation.offers_count ??
    reservation.offer_count ??
    reservation.received_offers_count;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  const offers = reservation.offers;
  if (Array.isArray(offers)) return offers.length;
  return null;
}

function offerDeadlineCopy(reservation: ReservationRecord) {
  const raw =
    (reservation.offers_deadline as string | undefined) ||
    (reservation.offer_deadline as string | undefined);
  if (raw) {
    const clock = faClock(raw);
    return clock
      ? `می‌توانید صبر کنید تا ساعت ${clock} پیشنهادهای بیشتری برسند.`
      : "می‌توانید صبر کنید تا پیشنهادهای بیشتری برسند.";
  }
  if (reservation.created_at) {
    const eta = new Date(reservation.created_at);
    if (!Number.isNaN(eta.getTime())) {
      eta.setHours(eta.getHours() + 2);
      const clock = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(eta);
      return `می‌توانید صبر کنید تا ساعت ${clock} پیشنهادهای بیشتری برسند.`;
    }
  }
  return "می‌توانید صبر کنید تا پیشنهادهای بیشتری برسند.";
}

function nurseContext(reservation: ReservationRecord) {
  const service =
    String(reservation.service_name || "").trim() || "مراقب مداوم";
  const person = recipientName(reservation);
  return person ? `${service} · ${person}` : service;
}

function visitContext(reservation: ReservationRecord) {
  const center = String(reservation.center_name || "").trim();
  return center ? `رزرو بازدید · ${center}` : "رزرو بازدید";
}

function serviceContext(reservation: ReservationRecord) {
  const service = String(reservation.service_name || "").trim() || "رزرو خدمت";
  const center = String(reservation.center_name || "").trim();
  return center ? `${service} · ${center}` : service;
}

function initialOf(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : "";
}

/** Build Home «وضعیت» card content from a live reservation record. */
export function buildHomeStatusCard(
  reservation: ReservationRecord
): HomeStatusCardModel {
  const flow = reservationFlow(reservation);
  const status = effectiveReservationStatus(reservation);
  const steps = buildReservationSteps(reservation);
  const stepCaption = reservationStepCaption(reservation);
  const interviewOptions = parseInterviewOptions(reservation.interview_options);
  const name = staffName(reservation);
  const count = offersCount(reservation);

  const base = {
    steps,
    stepCaption,
    staffInitial: name ? initialOf(name) : undefined
  };

  if (flow === "visit") {
    const stage = visitStage(reservation);
    const when = faDate(reservation.start_time, true);
    if (stage === "awaitingCenter") {
      return {
        ...base,
        contextLabel: visitContext(reservation),
        badge: { label: "در انتظار مرکز", tone: "info" },
        title: "وقت بازدید ثبت شد",
        subtitle: when
          ? `${when} · منتظر تأیید مرکز`
          : "منتظر تأیید مرکز هستید",
        notice:
          "شماره مرکز بعد از ثبت درخواست نمایش داده می‌شود. هماهنگی‌های بعدی را خودتان با مرکز انجام می‌دهید.",
        needsAction: false,
        actions: reservation.center_phone
          ? [
              {
                kind: "outlined",
                label: "تماس با مرکز",
                target: "call_center",
                icon: "phone"
              }
            ]
          : [
              {
                kind: "link",
                label: "مشاهده جزئیات",
                target: "details",
                icon: "chevron"
              }
            ]
      };
    }
    if (stage === "visitScheduled") {
      return {
        ...base,
        contextLabel: visitContext(reservation),
        badge: { label: "بازدید شما", tone: "action" },
        title: `بازدید از ${reservation.center_name || "مرکز"}`,
        subtitle: when || "زمان بازدید مشخص شده است",
        highlight: relativeServiceTime(reservation.start_time) || undefined,
        needsAction: true,
        actions: [
          ...(reservation.center_phone
            ? [
                {
                  kind: "outlined" as const,
                  label: "تماس با مرکز",
                  target: "call_center" as const,
                  icon: "phone" as const
                }
              ]
            : []),
          {
            kind: "link",
            label: "مشاهده جزئیات",
            target: "details",
            icon: "chevron"
          }
        ]
      };
    }
    return {
      ...base,
      contextLabel: visitContext(reservation),
      badge: { label: "بازدید", tone: "info" },
      title: reservationStatusHint(status),
      subtitle: when || "",
      needsAction: false,
      actions: [
        {
          kind: "link",
          label: "مشاهده جزئیات",
          target: "details",
          icon: "chevron"
        }
      ]
    };
  }

  if (flow === "nurse") {
    const showInterview =
      interviewOptions.length > 0 && !reservation.interview_at;
    const showInterviewWaiting =
      ["nurseSelected", "awaitingPayment"].includes(status) && !showInterview;

    if (NURSE_WAITING.has(status)) {
      const title =
        count != null
          ? `${faDigits(count)} پیشنهاد تا الان`
          : "در انتظار پیشنهاد مراکز";
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: {
          label: count && count > 0 ? "پیشنهاد جدید" : "در جریان",
          tone: count && count > 0 ? "success" : "info"
        },
        title,
        subtitle: offerDeadlineCopy(reservation),
        notice:
          count && count > 0
            ? undefined
            : "درخواست شما برای مراکز مرتبط فرستاده شد.",
        needsAction: Boolean(count && count > 0),
        actions:
          count && count > 0
            ? [
                {
                  kind: "link",
                  label: "مشاهده پیشنهادها",
                  target: "offers",
                  icon: "chevron"
                }
              ]
            : [
                {
                  kind: "link",
                  label: "مشاهده جزئیات",
                  target: "details",
                  icon: "chevron"
                }
              ]
      };
    }

    if (status === "offersReceived") {
      const title =
        count != null
          ? `${faDigits(count)} پیشنهاد رسیده`
          : "پیشنهادها آماده‌اند";
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: { label: "منتظر اقدام شما", tone: "action" },
        title,
        subtitle: "یکی از مراقب‌ها را انتخاب کنید تا مصاحبه هماهنگ شود.",
        needsAction: true,
        actions: [
          {
            kind: "primary",
            label: "مشاهده پیشنهادها",
            target: "offers"
          }
        ]
      };
    }

    if (showInterview) {
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: { label: "منتظر اقدام شما", tone: "action" },
        title: `زمان مصاحبه با ${name || "پرستار"}`,
        subtitle: "مرکز زمان‌های پیشنهادی فرستاده؛ زمان مناسب را انتخاب کنید.",
        staffInitial: name ? initialOf(name) : undefined,
        needsAction: true,
        actions: [
          {
            kind: "primary",
            label: "انتخاب زمان",
            target: "select_interview",
            icon: "clock"
          }
        ]
      };
    }

    if (showInterviewWaiting) {
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: { label: "در جریان", tone: "info" },
        title: "در انتظار هماهنگی مصاحبه",
        subtitle:
          "پس از ثبت زمان‌های پیشنهادی مرکز، امکان انتخاب زمان در جزئیات نمایش داده می‌شود.",
        staffInitial: name ? initialOf(name) : undefined,
        needsAction: false,
        actions: [
          {
            kind: "link",
            label: "مشاهده جزئیات",
            target: "details",
            icon: "chevron"
          }
        ]
      };
    }

    if (status === "trial_payment" || status === "awaitingPayment") {
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: { label: "منتظر اقدام شما", tone: "action" },
        title:
          status === "trial_payment"
            ? "پرداخت هزینه دو روز آزمایشی"
            : "در انتظار پرداخت",
        subtitle:
          status === "trial_payment"
            ? `مصاحبه با ${name || "پرستار"} انجام شد. برای شروع آزمایشی پرداخت کنید.`
            : "برای ادامه درخواست، هزینه را پرداخت کنید.",
        notice:
          status === "trial_payment"
            ? "اگر نیرو نیامد، هزینه آن روز به شما برمی‌گردد."
            : undefined,
        needsAction: true,
        actions: [
          {
            kind: "primary",
            label: "پرداخت",
            target: "pay"
          }
        ]
      };
    }

    if (status === "trial_in_progress") {
      const dayTitle =
        reservation.trial_attendance_user != null
          ? `روز دوم آزمایشی با ${name || "پرستار"}`
          : `روز آزمایشی با ${name || "پرستار"}`;
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: { label: "منتظر اقدام شما", tone: "action" },
        title: dayTitle,
        subtitle: "",
        highlight: reservation.trial_start_at
          ? `امروز از ساعت ${faClock(reservation.trial_start_at) || "۸ صبح"}`
          : relativeServiceTime(reservation.start_time) || "امروز",
        notice: `چرا می‌پرسیم؟ تا وقت‌شناسی و نظم ${name || "نیرو"} در امتیازش ثبت شود.`,
        staffInitial: name ? initialOf(name) : undefined,
        needsAction: true,
        actions: [
          {
            kind: "split",
            left: { label: "نرسید", action: "report_missed" },
            right: {
              label: "رسید",
              action: "report_attended",
              checkmark: true
            }
          }
        ]
      };
    }

    if (status === "trial_decision") {
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: { label: "منتظر اقدام شما", tone: "action" },
        title: "تصمیم شما چیست؟",
        subtitle: `روزهای آزمایشی با ${name || "پرستار"} تمام شد.`,
        notice:
          "اگر ادامه ندهید، دلیلش را می‌پرسیم تا نیروی مناسب‌تری معرفی شود.",
        staffInitial: name ? initialOf(name) : undefined,
        needsAction: true,
        actions: [
          {
            kind: "split",
            left: { label: "ادامه نمی‌دهم", action: "trial_stop" },
            right: {
              label: `ادامه با ${name || "پرستار"}`,
              action: "trial_continue"
            }
          }
        ]
      };
    }

    if (status === "awaiting_contract") {
      return {
        ...base,
        contextLabel: nurseContext(reservation),
        badge: { label: "منتظر اقدام شما", tone: "action" },
        title: "وقت بستن قرارداد",
        subtitle: `با ${reservation.center_name || "مرکز"} هماهنگ کنید. قرارداد در خود مرکز بسته می‌شود.`,
        notice:
          "با اطلاع دادن به ما، می‌توانیم کیفیت خدمت را پایش کنیم و ضمانت‌های سایبان را فعال کنیم.",
        needsAction: true,
        actions: reservation.center_phone
          ? [
              {
                kind: "outlined",
                label: "تماس با مرکز",
                target: "call_center",
                icon: "phone"
              }
            ]
          : [
              {
                kind: "primary",
                label: "مشاهده جزئیات",
                target: "details"
              }
            ]
      };
    }

    return {
      ...base,
      contextLabel: nurseContext(reservation),
      badge: { label: "در جریان", tone: "info" },
      title:
        String(reservation.status_title || "").trim() ||
        reservationStatusHint(status),
      subtitle:
        String(reservation.status_subtitle || "").trim() ||
        (name ? `پرستار: ${name}` : "") ||
        faDate(reservation.start_time, true),
      staffInitial: name ? initialOf(name) : undefined,
      needsAction: false,
      actions: [
        ...(reservation.center_phone
          ? [
              {
                kind: "outlined" as const,
                label: "تماس با مرکز",
                target: "call_center" as const,
                icon: "phone" as const
              }
            ]
          : []),
        {
          kind: "link",
          label: "مشاهده جزئیات",
          target: "details",
          icon: "chevron"
        }
      ]
    };
  }

  // Ordinary service bookings are usually excluded from Home status, but keep
  // a safe fallback if one is passed in.
  return {
    ...base,
    contextLabel: serviceContext(reservation),
    badge: { label: "در جریان", tone: "info" },
    title:
      String(reservation.status_title || "").trim() ||
      reservationStatusHint(status),
    subtitle:
      String(reservation.status_subtitle || "").trim() ||
      faDate(reservation.start_time, true),
    needsAction: status === "awaitingPayment",
    actions:
      status === "awaitingPayment"
        ? [{ kind: "primary", label: "پرداخت", target: "pay" }]
        : [
            {
              kind: "link",
              label: "مشاهده جزئیات",
              target: "details",
              icon: "chevron"
            }
          ]
  };
}

export function isActiveHomeReservation(reservation: ReservationRecord) {
  return bookingTabForReservation(reservation) === "active";
}
