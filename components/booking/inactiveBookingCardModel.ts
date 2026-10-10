import { BOOKING_CREATE_ROUTES } from "./bookingCreateRoutes";
import {
  effectiveReservationStatus,
  reservationFlow,
  type ReservationRecord
} from "../reservation/reservationDetailsModel";

export type InactiveBadgeTone = "completed" | "expired" | "canceled";

export type InactiveBookingAction =
  | { kind: "invoice"; label: string }
  | { kind: "repeat"; label: string };

export type InactiveBookingCardModel = {
  badge: { label: string; tone: InactiveBadgeTone };
  contextLabel: string;
  title: string;
  subtitle: string;
  actions: InactiveBookingAction[];
  repeatRoute: string;
};

const COMPLETED_DONE = new Set([
  "completed",
  "serviceFinished",
  "contract_closed"
]);

const EXPIRED = new Set(["rejected", "userNoResponse"]);

const CANCELED = new Set([
  "canceled",
  "cancelled",
  "refunded",
  "trial_stopped"
]);

function faDayMonth(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function recipientName(reservation: ReservationRecord) {
  const patient = reservation.patient as { name?: string } | null | undefined;
  return String(
    reservation.user?.name ||
      patient?.name ||
      reservation.patient_name ||
      reservation.elderly_name ||
      ""
  ).trim();
}

function serviceLabel(reservation: ReservationRecord) {
  const flow = reservationFlow(reservation);
  const named = String(reservation.service_name || "").trim();
  if (named) return named;
  if (flow === "nurse") return "مراقب مداوم";
  if (flow === "visit") return "بازدید از مرکز";
  return "رزرو خدمت";
}

function contextLabel(reservation: ReservationRecord) {
  const service = serviceLabel(reservation);
  const person = recipientName(reservation);
  if (!person) return service;
  const suffix = EXPIRED.has(effectiveReservationStatus(reservation))
    ? `${person} (قبلی)`
    : person;
  return `${service} · ${suffix}`;
}

function userRating(reservation: ReservationRecord): number | null {
  const raw =
    reservation.user_rating ??
    reservation.rating ??
    reservation.review_rating ??
    reservation.rate;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

function refundSubtitle(reservation: ReservationRecord): string {
  const payment = String(reservation.payment_status || "").toLowerCase();
  if (payment === "refunded") return "مبلغ به‌طور کامل بازگشت داده شد";
  const policy = reservation.cancellation_policy;
  let percent: number | null = null;
  if (policy && typeof policy === "object") {
    const n = Number(
      (policy as { partial_refund_percent?: number }).partial_refund_percent
    );
    if (Number.isFinite(n) && n > 0) percent = n;
  } else if (typeof policy === "string" && policy.trim()) {
    try {
      const parsed = JSON.parse(policy);
      const n = Number(parsed?.partial_refund_percent);
      if (Number.isFinite(n) && n > 0) percent = n;
    } catch {
      /* ignore */
    }
  }
  if (percent != null) {
    return `${percent.toLocaleString("fa-IR")}٪ مبلغ بازگشت داده شد`;
  }
  if (payment === "paid" || payment === "completed") {
    return "وضعیت بازگشت وجه را در جزئیات ببینید";
  }
  return "پولی گرفته نشد";
}

function repeatRouteFor(reservation: ReservationRecord) {
  const flow = reservationFlow(reservation);
  if (flow === "nurse") return BOOKING_CREATE_ROUTES.nurse;
  if (flow === "visit") return BOOKING_CREATE_ROUTES.centerVisit;
  return BOOKING_CREATE_ROUTES.centerVisit;
}

export function inactiveBadgeTone(
  reservation: ReservationRecord
): InactiveBadgeTone {
  const status = effectiveReservationStatus(reservation);
  if (COMPLETED_DONE.has(status)) return "completed";
  if (EXPIRED.has(status)) return "expired";
  if (CANCELED.has(status)) return "canceled";
  return "canceled";
}

/** Build inactive/completed booking card copy from a live reservation. */
export function buildInactiveBookingCard(
  reservation: ReservationRecord
): InactiveBookingCardModel {
  const tone = inactiveBadgeTone(reservation);
  const when = faDayMonth(
    String(
      reservation.end_time ||
        reservation.contract_closed_at ||
        reservation.updated_at ||
        reservation.start_time ||
        reservation.created_at ||
        ""
    )
  );
  const rating = userRating(reservation);
  const repeatRoute = repeatRouteFor(reservation);

  if (tone === "completed") {
    return {
      badge: { label: "تمام شد", tone },
      contextLabel: contextLabel(reservation),
      title: when ? `خدمت انجام شد ${when}` : "خدمت انجام شد",
      subtitle: rating
        ? `امتیاز شما: ★ ${rating.toLocaleString("fa-IR")}`
        : "خدمت با موفقیت انجام شد",
      actions: [
        { kind: "invoice", label: "مشاهده فاکتور" },
        { kind: "repeat", label: "درخواست مجدد" }
      ],
      repeatRoute
    };
  }

  if (tone === "expired") {
    return {
      badge: { label: "منقضی", tone },
      contextLabel: contextLabel(reservation),
      title: "درخواست بدون پیشنهاد بسته شد",
      subtitle: "هیچ مرکزی پیشنهاد نداد · پولی گرفته نشد",
      actions: [{ kind: "repeat", label: "درخواست مجدد" }],
      repeatRoute
    };
  }

  return {
    badge: { label: "لغو شده", tone },
    contextLabel: contextLabel(reservation),
    title: when ? `لغو شد ${when}` : "درخواست لغو شد",
    subtitle: refundSubtitle(reservation),
    actions: [{ kind: "repeat", label: "درخواست مجدد" }],
    repeatRoute
  };
}
