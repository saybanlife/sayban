import type { VisitPostVisitMeta } from "./visitPostVisitModel";
import {
  hasReservationCenterReview,
  mergeReviewIntoMeta,
  readVisitPostVisitMeta,
  VISIT_NO_CONTRACT_REASONS,
  type VisitNoContractReason
} from "./visitPostVisitModel";
import type { ReservationRecord } from "./reservationDetailsModel";

export type CenterReviewFormState = {
  rating: number;
  publicComment: string;
  privateComment: string;
  declineReason: VisitNoContractReason | "";
  requestSupport: boolean;
};

export function centerReviewTitle(reservation: ReservationRecord | null): string {
  const center = String(reservation?.center_name || "مرکز").trim();
  return `نظر شما درباره ${center}`;
}

export function isSignedContractReview(
  reservation: ReservationRecord | null,
  querySigned?: string | null
): boolean {
  const meta = readVisitPostVisitMeta(reservation);
  if (typeof meta?.contract_signed === "boolean") return meta.contract_signed;
  if (querySigned === "1" || querySigned === "true") return true;
  if (querySigned === "0" || querySigned === "false") return false;
  return true;
}

export function signedReviewIntro(): string {
  return (
    "خوشحالیم که قرارداد بسته شد. این نظر فقط درباره ورود و نحوه تعامل مرکز تا زمان قرارداد است: " +
    "پاسخ‌گویی، رفتار و شفافیت قیمت. هر وقت خواستید می‌توانید نظرتان را تغییر دهید. " +
    "نظر درباره خدمت و پشتیبانی مرکز را بعداً در جای دیگری می‌پرسیم."
  );
}

export function unsignedReviewIntro(): string {
  return "اشکالی ندارد. دلیلش را بگویید تا مراکز و تجربه بعدی شما بهتر شود.";
}

export function validateCenterReviewForm(
  state: CenterReviewFormState,
  signed: boolean
): string {
  if (!Number.isFinite(state.rating) || state.rating < 1 || state.rating > 5) {
    return "لطفاً امتیاز ۱ تا ۵ را انتخاب کنید.";
  }
  if (!signed && !state.declineReason) {
    return "لطفاً یکی از دلایل را انتخاب کنید.";
  }
  return "";
}

export function buildCenterReviewSubmitBody(input: {
  reservation: ReservationRecord;
  state: CenterReviewFormState;
  signed: boolean;
}): Record<string, unknown> {
  const centerId = Number(
    input.reservation.center_id ?? input.reservation.centerId
  );
  return {
    center_id: centerId,
    reservation_id: input.reservation.id,
    rate: input.state.rating,
    comment: String(input.state.publicComment || "").trim(),
    private_comment: String(input.state.privateComment || "").trim(),
    contract_signed: input.signed,
    decline_reason: input.signed ? null : input.state.declineReason || null,
    support_requested: input.signed ? false : Boolean(input.state.requestSupport)
  };
}

export function canOpenCenterReview(reservation: ReservationRecord | null): boolean {
  if (!reservation?.id) return false;
  if (hasReservationCenterReview(reservation)) return false;
  return true;
}

export { VISIT_NO_CONTRACT_REASONS, mergeReviewIntoMeta };
