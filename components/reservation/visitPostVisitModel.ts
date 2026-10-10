import {
  buildReservationSteps,
  reservationFlow,
  reservationStepCaption,
  visitStage,
  type ReservationRecord,
  type ReservationStep
} from "./reservationDetailsModel";

export type VisitPostVisitMeta = {
  contract_signed?: boolean | null;
  decline_reason?: string | null;
  support_requested?: boolean | null;
  review_submitted_at?: string | null;
};

export const VISIT_NO_CONTRACT_REASONS = [
  "قیمت یا شرایط مناسب نبود",
  "نیروی دیگری پیدا کردم",
  "مرکز پاسخگو نبود",
  "رفتار مرکز مناسب نبود",
  "هنوز تصمیم نگرفته‌ام",
  "دلیل دیگر"
] as const;

export type VisitNoContractReason = (typeof VISIT_NO_CONTRACT_REASONS)[number];

export function parseVisitPostVisitMeta(
  raw: unknown
): VisitPostVisitMeta | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as VisitPostVisitMeta;
  }
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as VisitPostVisitMeta) : null;
  } catch {
    return null;
  }
}

export function serializeVisitPostVisitMeta(meta: VisitPostVisitMeta): string {
  return JSON.stringify(meta);
}

export function mergeReviewIntoMeta(
  meta: VisitPostVisitMeta | null,
  patch: Partial<VisitPostVisitMeta>
): VisitPostVisitMeta {
  return { ...(meta || {}), ...patch };
}

export function readVisitPostVisitMeta(
  reservation: ReservationRecord | null
): VisitPostVisitMeta | null {
  if (!reservation) return null;
  return parseVisitPostVisitMeta(
    reservation.visit_post_visit_meta ??
      (reservation as { lifecycle?: { visit_post_visit_meta?: unknown } })
        .lifecycle?.visit_post_visit_meta
  );
}

export function isVisitReservationEnded(
  reservation: ReservationRecord | null
): boolean {
  if (!reservation || reservationFlow(reservation) !== "visit") return false;
  return visitStage(reservation) === "visitDone";
}

export function hasReservationCenterReview(
  reservation: ReservationRecord | null
): boolean {
  if (!reservation) return false;
  const meta = readVisitPostVisitMeta(reservation);
  if (meta?.review_submitted_at) return true;
  return Boolean(
    reservation.user_review ||
      reservation.review ||
      reservation.reviewed_at ||
      reservation.rating ||
      reservation.center_review_id
  );
}

export function visitContractFeedbackKnown(
  reservation: ReservationRecord | null
): boolean {
  const meta = readVisitPostVisitMeta(reservation);
  return typeof meta?.contract_signed === "boolean";
}

export function visitNeedsPostVisitHomeStatus(
  reservation: ReservationRecord | null
): boolean {
  if (!isVisitReservationEnded(reservation)) return false;
  if (hasReservationCenterReview(reservation)) return false;
  return true;
}

export function visitAwaitingContractAnswer(
  reservation: ReservationRecord | null
): boolean {
  return (
    visitNeedsPostVisitHomeStatus(reservation) &&
    !visitContractFeedbackKnown(reservation)
  );
}

export function visitAwaitingCenterReview(
  reservation: ReservationRecord | null
): boolean {
  return (
    visitNeedsPostVisitHomeStatus(reservation) &&
    visitContractFeedbackKnown(reservation)
  );
}

function toFaDigits(value: number): string {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

/** Five-step progress after visit: ثبت → تأیید → بازدید → قرارداد → نظر */
export function buildVisitPostVisitSteps(
  reservation: ReservationRecord | null
): ReservationStep[] {
  const meta = readVisitPostVisitMeta(reservation);
  const contractKnown = typeof meta?.contract_signed === "boolean";
  const reviewed = hasReservationCenterReview(reservation);

  const defs = [
    { key: "request" as const, label: "ثبت", done: true },
    { key: "centerConfirm" as const, label: "تأیید مرکز", done: true },
    { key: "service" as const, label: "بازدید", done: true },
    {
      key: "contract" as const,
      label: "قرارداد",
      done: contractKnown
    },
    {
      key: "review" as const,
      label: "نظر",
      done: reviewed
    }
  ];

  let currentKey: ReservationStep["key"] = "contract";
  if (contractKnown && !reviewed) currentKey = "review";
  if (reviewed) currentKey = "review";

  return defs.map(step => ({
    ...step,
    current: !reviewed && step.key === currentKey
  }));
}

export function visitPostVisitStepCaption(
  reservation: ReservationRecord | null
): string {
  const steps = buildVisitPostVisitSteps(reservation);
  const currentIndex = steps.findIndex(step => step.current);
  const index = currentIndex >= 0 ? currentIndex : steps.length - 1;
  const label = steps[index]?.label || "قرارداد";
  return `مرحله ${toFaDigits(index + 1)} از ${toFaDigits(steps.length)} · ${label}`;
}

export function reservationReviewPath(
  _pageBase: string,
  reservationId: string | number,
  options?: { signed?: boolean }
): string {
  const base = `/reservation-center-review/${reservationId}`;
  if (options?.signed === false) return `${base}?signed=0`;
  if (options?.signed === true) return `${base}?signed=1`;
  return base;
}

export function extractReservationReviewIdFromSlug(
  slug: string | string[] | undefined
): string | null {
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const hit = parts.find(part => String(part).startsWith("reservation_review_"));
  if (!hit) return null;
  const id = String(hit).slice("reservation_review_".length).trim();
  return id || null;
}

/** Active visit steps while visit is in progress; post-visit uses buildVisitPostVisitSteps. */
export function homeStatusStepsForReservation(
  reservation: ReservationRecord
): ReservationStep[] {
  if (visitNeedsPostVisitHomeStatus(reservation)) {
    return buildVisitPostVisitSteps(reservation);
  }
  return buildReservationSteps(reservation);
}

export function homeStatusStepCaptionForReservation(
  reservation: ReservationRecord
): string {
  if (visitNeedsPostVisitHomeStatus(reservation)) {
    return visitPostVisitStepCaption(reservation);
  }
  return reservationStepCaption(reservation);
}
