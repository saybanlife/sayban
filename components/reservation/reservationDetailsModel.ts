export type ReservationRecord = {
  id?: string | number;
  status?: string;
  payment_status?: string;
  service_location?: string;
  service_name?: string;
  center_name?: string;
  reservation_code?: string;
  start_time?: string;
  created_at?: string;
  answers?: string;
  user?: { name?: string; phone?: string };
  staff?: { name?: string; avatar?: string } | null;
  user_address?: string;
  user_addressTitle?: string;
  user_addressCity?: string;
  final_price?: number | string;
  [key: string]: unknown;
};

export type ReservationStepKey =
  | "request"
  | "nurseOffer"
  | "payment"
  | "centerConfirm";

export type ReservationStep = {
  key: ReservationStepKey;
  label: string;
  done: boolean;
  current: boolean;
};

const TERMINAL_NEGATIVE = new Set([
  "canceled",
  "rejected",
  "refunded",
  "userNoResponse"
]);

const AFTER_OFFER = new Set([
  "offersReceived",
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

export function isNurseReservation(reservation: ReservationRecord | null) {
  return reservation?.service_location === "home";
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

export function buildReservationSteps(
  reservation: ReservationRecord | null
): ReservationStep[] {
  const status = String(reservation?.status ?? "pending");
  const nurse = isNurseReservation(reservation);
  const paid = isPaymentDone(reservation);
  const negative = TERMINAL_NEGATIVE.has(status);

  const defs: { key: ReservationStepKey; label: string; done: boolean }[] =
    nurse
      ? [
          {
            key: "request",
            label: "ثبت درخواست",
            done: Boolean(reservation?.id)
          },
          {
            key: "nurseOffer",
            label: "پیشنهاد پرستار",
            done:
              !negative &&
              (AFTER_OFFER.has(status) || Boolean(reservation?.staff?.name))
          },
          {
            key: "payment",
            label: "پرداخت",
            done: !negative && paid
          },
          {
            key: "centerConfirm",
            label: "تأیید مرکز",
            done: !negative && CENTER_CONFIRMED.has(status)
          }
        ]
      : [
          {
            key: "request",
            label: "تکمیل رزرو",
            done: Boolean(reservation?.id)
          },
          {
            key: "payment",
            label: "پرداخت",
            done: !negative && paid
          },
          {
            key: "centerConfirm",
            label: "تأیید مرکز",
            done: !negative && CENTER_CONFIRMED.has(status)
          }
        ];

  const firstOpen = defs.findIndex(step => !step.done);
  return defs.map((step, index) => ({
    ...step,
    current: !negative && (firstOpen === -1 ? index === defs.length - 1 && step.done : index === firstOpen)
  }));
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
