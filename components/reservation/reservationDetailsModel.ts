import {
  isVisitService,
  isVisitServiceName,
  VISIT_SERVICE_CODE
} from "./visitBooking";

export type ReservationRecord = {
  id?: string | number;
  status?: string;
  payment_status?: string;
  service_id?: string | number | null;
  service_location?: string;
  service_name?: string;
  center_name?: string;
  reservation_code?: string;
  start_time?: string;
  created_at?: string;
  answers?: string;
  user?: { name?: string; phone?: string };
  staff?: { name?: string; avatar?: string; rating?: number | string } | null;
  staff_rating?: number | string | null;
  user_address?: string;
  user_addressTitle?: string;
  user_addressCity?: string;
  final_price?: number | string;
  service_code?: string;
  center_address?: string;
  center_city?: string;
  center_phone?: string;
  center_latitude?: number | string;
  center_longitude?: number | string;
  staff_name?: string;
  staff_avatar?: string;
  lifecycle_stage?: string | null;
  selected_offer_id?: string | number | null;
  interview_options?: string | InterviewOption[] | null;
  interview_at?: string | null;
  interview_mode?: "online" | "home" | "center" | null;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  trial_daily_price?: number | string | null;
  trial_total_price?: number | string | null;
  trial_attendance_user?: boolean | number | null;
  trial_attendance_staff?: boolean | number | null;
  trial_decision?: "continue" | "stop" | null;
  contract_deadline?: string | null;
  contract_closed_at?: string | null;
  cancellation_policy?: string | CancellationPolicy | null;
  [key: string]: unknown;
};

export type InterviewOption = {
  starts_at: string;
  ends_at?: string;
  modes?: Array<"online" | "home" | "center">;
};

export type CancellationPolicy = {
  full_refund_before_hours?: number;
  partial_refund_before_hours?: number;
  partial_refund_percent?: number;
};

export type ReservationFlow = "nurse" | "visit" | "service";

export type ReservationStepKey =
  | "request"
  | "nurseOffer"
  | "interview"
  | "trial"
  | "contract"
  | "payment"
  | "centerConfirm"
  | "service"
  | "review";

export type ReservationStep = {
  key: ReservationStepKey;
  label: string;
  done: boolean;
  current: boolean;
};

const TERMINAL_NEGATIVE = new Set([
  "canceled",
  "cancelled",
  "rejected",
  "refunded",
  "userNoResponse"
]);

/**
 * Statuses where the customer may still cancel from reservation details.
 * Keep in sync with n8n `reservations/lifecycle` cancel SQL and
 * `reservationLifecycleService.applyReservationAction`.
 */
export const CANCELABLE_RESERVATION_STATUSES = [
  "draft",
  "registered",
  "pending",
  "awaitingOffers",
  "awaitingSupport",
  "offersReceived",
  "nurseSelected",
  "awaitingPayment",
  "paymentCompleted",
  "confirmed",
  "finalConfirmed",
  "readyForDispatch"
] as const;

export function canCancelReservation(
  reservation: ReservationRecord | null | undefined
): boolean {
  const status = String(reservation?.status || "");
  if (!status || TERMINAL_NEGATIVE.has(status)) return false;
  return (CANCELABLE_RESERVATION_STATUSES as readonly string[]).includes(
    status
  );
}

const AFTER_OFFER = new Set([
  "nurseSelected",
  "awaitingPayment",
  "paymentCompleted",
  "awaitingCenterContact",
  "underFinalReview",
  "readyForDispatch",
  "confirmed",
  "finalConfirmed",
  "inProgress",
  "completed",
  "serviceFinished"
]);

const AFTER_PAYMENT = new Set([
  "paymentCompleted",
  "awaitingCenterContact",
  "underFinalReview",
  "readyForDispatch",
  "confirmed",
  "finalConfirmed",
  "inProgress",
  "completed",
  "serviceFinished"
]);

const CENTER_CONFIRMED = new Set([
  "confirmed",
  "finalConfirmed",
  "readyForDispatch",
  "inProgress",
  "completed",
  "serviceFinished"
]);

export function isNurseStaffingReservation(
  reservation: ReservationRecord | null
) {
  if (!reservation || reservation.service_location !== "home") return false;
  const serviceId = reservation.service_id;
  return serviceId === null || serviceId === undefined || serviceId === "";
}

/** Backward-compatible name used by existing booking/detail wrappers. */
export const isNurseReservation = isNurseStaffingReservation;

export function isVisitReservation(
  reservation: ReservationRecord | null
): boolean {
  if (!reservation) return false;
  if (
    String(reservation.service_code || "").toUpperCase() === VISIT_SERVICE_CODE
  ) {
    return true;
  }
  if (isVisitServiceName(reservation.service_name)) return true;
  if (isVisitService(reservation.service)) return true;
  const services = reservation.services;
  if (Array.isArray(services) && services.some(item => isVisitService(item))) {
    return true;
  }
  return false;
}

export function reservationFlow(
  reservation: ReservationRecord | null
): ReservationFlow {
  // Visit before nurse: visit rows can also carry service_location quirks.
  if (isVisitReservation(reservation)) return "visit";
  if (isNurseStaffingReservation(reservation)) return "nurse";
  return "service";
}

export function effectiveReservationStatus(
  reservation: ReservationRecord | null
) {
  const baseStatus = String(reservation?.status || "");
  if (TERMINAL_NEGATIVE.has(baseStatus)) return baseStatus;
  return String(reservation?.lifecycle_stage || reservation?.status || "pending");
}

export function parseInterviewOptions(
  value: ReservationRecord["interview_options"]
): InterviewOption[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseCancellationPolicy(
  value: ReservationRecord["cancellation_policy"]
): CancellationPolicy | null {
  if (value && typeof value === "object") return value as CancellationPolicy;
  if (!value) return null;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function numericPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value)
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٬,\s]/g, "");
  const price = Number(normalized);
  return Number.isFinite(price) ? price : null;
}

export function isFreeReservation(reservation: ReservationRecord | null) {
  if (!reservation) return false;
  const payment = reservation.payment as Record<string, unknown> | undefined;
  const service = reservation.service as Record<string, unknown> | undefined;
  const prices = [
    reservation.final_price,
    payment?.final_price,
    service?.final_price
  ];
  const resolvedPrice = prices
    .map(numericPrice)
    .find((value): value is number => value !== null);
  return resolvedPrice === 0;
}

export function isPaymentDone(reservation: ReservationRecord | null) {
  if (!reservation) return false;
  if (isFreeReservation(reservation)) return true;
  if (reservation.payment_status === "paid") return true;
  return AFTER_PAYMENT.has(String(reservation.status ?? ""));
}

/* ───────────── جریان بازدید: ۳ مرحله ─────────────
   ثبت → تأیید مرکز → بازدید
   فقط از status واقعی رزرو محاسبه می‌شود. */

export type VisitStage =
  | "awaitingCenter"
  | "visitScheduled"
  | "visitDone"
  | "cancelled";

const VISIT_DONE = new Set(["completed", "serviceFinished"]);

export function visitStage(reservation: ReservationRecord | null): VisitStage {
  const status = String(reservation?.status || "");
  if (TERMINAL_NEGATIVE.has(status)) return "cancelled";
  if (VISIT_DONE.has(status)) return "visitDone";
  if (CENTER_CONFIRMED.has(status)) return "visitScheduled";
  return "awaitingCenter";
}

function markCurrent(
  defs: Array<{ key: ReservationStepKey; label: string; done: boolean }>,
  negative: boolean
): ReservationStep[] {
  const firstOpen = defs.findIndex(step => !step.done);
  return defs.map((step, index) => ({
    ...step,
    current:
      !negative &&
      (firstOpen === -1
        ? index === defs.length - 1 && step.done
        : index === firstOpen)
  }));
}

export function buildVisitSteps(
  reservation: ReservationRecord | null
): ReservationStep[] {
  const stage = visitStage(reservation);
  const negative = stage === "cancelled";
  const steps = markCurrent(
    [
      {
        key: "request",
        label: "ثبت",
        done: Boolean(reservation?.id)
      },
      {
        key: "centerConfirm",
        label: "تأیید مرکز",
        done: !negative && (stage === "visitScheduled" || stage === "visitDone")
      },
      {
        key: "service",
        label: "بازدید",
        done: !negative && stage === "visitDone"
      }
    ],
    negative
  );
  // Visit keeps «بازدید» current after center confirms (not just first open).
  return steps.map((step, index) => {
    if (negative) return { ...step, current: false };
    if (stage === "awaitingCenter") return { ...step, current: index === 1 };
    if (stage === "visitScheduled") return { ...step, current: index === 2 };
    if (stage === "visitDone") {
      return { ...step, current: index === 2 && step.done };
    }
    return step;
  });
}

const NURSE_OFFER_OPEN = new Set([
  "draft",
  "registered",
  "pending",
  "awaitingOffers",
  "awaitingSupport",
  "offersReceived"
]);

const NURSE_AFTER_INTERVIEW = new Set([
  "interview_completed",
  "trial_payment",
  "trial_in_progress",
  "trial_decision",
  "awaiting_contract",
  "contract_closed"
]);

const NURSE_AFTER_TRIAL = new Set(["awaiting_contract", "contract_closed"]);

export function buildNurseSteps(
  reservation: ReservationRecord | null
): ReservationStep[] {
  const status = effectiveReservationStatus(reservation);
  const rawStatus = String(reservation?.status || "");
  const negative =
    TERMINAL_NEGATIVE.has(status) || TERMINAL_NEGATIVE.has(rawStatus);

  return markCurrent(
    [
      {
        key: "request",
        label: "ثبت",
        done: Boolean(reservation?.id)
      },
      {
        key: "nurseOffer",
        label: "پیشنهاد",
        done: !negative && !NURSE_OFFER_OPEN.has(status)
      },
      {
        key: "interview",
        label: "مصاحبه",
        done:
          !negative &&
          (NURSE_AFTER_INTERVIEW.has(status) || Boolean(reservation?.interview_at))
      },
      {
        key: "trial",
        label: "آزمایشی",
        done: !negative && NURSE_AFTER_TRIAL.has(status)
      },
      {
        key: "contract",
        label: "قرارداد",
        done: !negative && status === "contract_closed"
      }
    ],
    negative
  );
}

const SERVICE_OFFER_OPEN = new Set([
  "draft",
  "registered",
  "pending",
  "awaitingOffers",
  "awaitingSupport"
]);

export function buildServiceSteps(
  reservation: ReservationRecord | null
): ReservationStep[] {
  const status = effectiveReservationStatus(reservation);
  const rawStatus = String(reservation?.status || "");
  const negative =
    TERMINAL_NEGATIVE.has(status) || TERMINAL_NEGATIVE.has(rawStatus);
  const paid = isPaymentDone(reservation);
  const serviceDone =
    !negative && ["completed", "serviceFinished"].includes(rawStatus);
  const serviceStarted =
    !negative &&
    (serviceDone ||
      ["inProgress", "readyForDispatch", "confirmed", "finalConfirmed"].includes(
        rawStatus
      ));
  const reviewed = Boolean(
    reservation?.user_review ||
      reservation?.review ||
      reservation?.reviewed_at ||
      reservation?.rating
  );

  return markCurrent(
    [
      {
        key: "request",
        label: "ثبت",
        done: Boolean(reservation?.id)
      },
      {
        key: "nurseOffer",
        label: "پیشنهاد",
        done:
          !negative &&
          (!SERVICE_OFFER_OPEN.has(status) ||
            paid ||
            Boolean(reservation?.center_name) ||
            AFTER_OFFER.has(rawStatus))
      },
      {
        key: "payment",
        label: "پرداخت",
        done: !negative && paid
      },
      {
        key: "service",
        label: "خدمت",
        done: serviceDone
      },
      {
        key: "review",
        label: "نظر",
        done: !negative && Boolean(reviewed)
      }
    ],
    negative
  ).map((step, index, steps) => {
    // Keep «خدمت» current while in progress even if payment is done.
    if (
      !negative &&
      !serviceDone &&
      serviceStarted &&
      step.key === "service"
    ) {
      return { ...step, current: true };
    }
    if (
      !negative &&
      !serviceDone &&
      serviceStarted &&
      step.key !== "service"
    ) {
      return { ...step, current: false };
    }
    if (!negative && serviceDone && !reviewed && step.key === "review") {
      return { ...step, current: true };
    }
    if (!negative && serviceDone && !reviewed && step.key !== "review") {
      return { ...step, current: false };
    }
    return step;
  });
}

function toFaDigits(value: number): string {
  return String(value).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]!);
}

const VISIT_HINTS: Record<string, string> = {
  paymentCompleted: "پرداخت انجام شد. در انتظار تأیید مرکز هستید.",
  awaitingCenterContact: "مرکز به‌زودی با شما تماس می‌گیرد.",
  underFinalReview: "درخواست بازدید در حال بررسی توسط مرکز است."
};

export function visitStatusHint(status?: string) {
  if (status && VISIT_HINTS[status]) return VISIT_HINTS[status];
  if (status && TERMINAL_NEGATIVE.has(status)) {
    return reservationStatusHint(status);
  }
  return "درخواست بازدید شما ثبت شده و در انتظار تأیید مرکز است.";
}

export function buildReservationSteps(
  reservation: ReservationRecord | null
): ReservationStep[] {
  const flow = reservationFlow(reservation);
  if (flow === "visit") return buildVisitSteps(reservation);
  if (flow === "nurse") return buildNurseSteps(reservation);
  return buildServiceSteps(reservation);
}

/** Caption under progress bars: «مرحله ۲ از ۳ · تأیید مرکز». */
export function reservationStepCaption(
  reservation: ReservationRecord | null
): string {
  const steps = buildReservationSteps(reservation);
  if (!steps.length) return "";
  const currentIndex = steps.findIndex(step => step.current);
  const index =
    currentIndex >= 0
      ? currentIndex
      : Math.max(
          0,
          steps.reduce((lastDone, step, i) => (step.done ? i : lastDone), 0)
        );
  const label = steps[index]?.label || "";
  return `مرحله ${toFaDigits(index + 1)} از ${toFaDigits(steps.length)} · ${label}`;
}

export const STATUS_HINTS: Record<string, string> = {
  pending: "درخواست شما ثبت شده و در انتظار بررسی است.",
  awaitingOffers: "در حال جستجوی پرستار مناسب برای درخواست شما هستیم.",
  offersReceived: "پیشنهاد پرستار آماده است؛ می‌توانید پرستار را انتخاب کنید.",
  nurseSelected: "پرستار انتخاب شد. در صورت نیاز، مرحله پرداخت را انجام دهید.",
  awaitingPayment: "لطفاً هزینه رزرو را پرداخت کنید تا درخواست ادامه پیدا کند.",
  paymentCompleted: "پرداخت انجام شد. در انتظار تأیید مرکز هستید.",
  awaitingCenterContact: "مرکز به‌زودی با شما تماس می‌گیرد.",
  underFinalReview: "درخواست در حال بررسی نهایی توسط مرکز است.",
  confirmed: "رزرو توسط مرکز تأیید شده است.",
  finalConfirmed: "رزرو به‌صورت نهایی تأیید شده است.",
  readyForDispatch: "آماده‌سازی برای اعزام انجام شده است.",
  inProgress: "خدمت در حال انجام است.",
  completed: "خدمت با موفقیت تکمیل شده است.",
  serviceFinished: "خدمت پایان یافته است.",
  canceled: "این رزرو لغو شده است.",
  rejected: "این رزرو رد شده است.",
  refunded: "وجه این رزرو مسترد شده است."
};

export function reservationStatusHint(status?: string) {
  if (!status) return "وضعیت این رزرو در حال به‌روزرسانی است.";
  return STATUS_HINTS[status] ?? "وضعیت این رزرو در حال به‌روزرسانی است.";
}

export function paymentStatusLabel(paymentStatus?: string) {
  if (paymentStatus === "paid") return "پرداخت شده";
  if (paymentStatus === "unpaid") return "پرداخت نشده";
  if (paymentStatus === "refunded") return "مسترد شده";
  return "نامشخص";
}

export function reservationPaymentStatusLabel(
  reservation: ReservationRecord | null
) {
  return isFreeReservation(reservation)
    ? "رایگان"
    : paymentStatusLabel(reservation?.payment_status);
}

export function extractReservationIdFromSlug(
  slug: string | string[] | undefined
): string | null {
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const hit = parts.find(part => String(part).startsWith("reservation_"));
  if (!hit) return null;
  const id = String(hit).slice("reservation_".length).trim();
  return id || null;
}

export const RESERVATION_CACHE_KEY = "reservationDetail";