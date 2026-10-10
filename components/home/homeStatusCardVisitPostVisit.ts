import {
  buildReservationSteps,
  effectiveReservationStatus,
  reservationFlow,
  reservationStatusHint,
  reservationStepCaption,
  visitStage,
  type ReservationRecord,
  type ReservationStep
} from "../reservation/reservationDetailsModel";
import type {
  HomeStatusAction,
  HomeStatusCardModel
} from "./homeStatusCardModel";
import { buildHomeStatusCard } from "./homeStatusCardModel";
import {
  homeStatusStepCaptionForReservation,
  homeStatusStepsForReservation,
  visitAwaitingCenterReview,
  visitAwaitingContractAnswer,
  visitNeedsPostVisitHomeStatus
} from "../reservation/visitPostVisitModel";

function centerInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : "";
}

function visitContext(reservation: ReservationRecord) {
  const center = String(reservation.center_name || "").trim();
  return center ? `رزرو بازدید · ${center}` : "رزرو بازدید";
}

/** Home status card builder with post–visit contract + review states. */
export function buildHomeStatusCardWithVisitPostVisit(
  reservation: ReservationRecord
): HomeStatusCardModel {
  const flow = reservationFlow(reservation);
  if (flow !== "visit" || !visitNeedsPostVisitHomeStatus(reservation)) {
    return buildHomeStatusCard(reservation);
  }

  const center = String(reservation.center_name || "مرکز").trim();
  const steps = homeStatusStepsForReservation(reservation);
  const stepCaption = homeStatusStepCaptionForReservation(reservation);
  const baseSteps = buildReservationSteps(reservation);

  if (visitAwaitingContractAnswer(reservation)) {
    return {
      contextLabel: visitContext(reservation),
      badge: { label: "منتظر اقدام شما", tone: "action" },
      title: `آیا با «${center}» قرارداد بستید؟`,
      subtitle: "خبر شما را منتظریم.",
      steps,
      stepCaption,
      staffInitial: centerInitial(center),
      needsAction: true,
      notice:
        "با اطلاع‌دادن به ما، می‌توانیم کیفیت خدمت را پایش کنیم و ضمانت‌های سایبان را برای شما فعال کنیم.",
      actions: [
        {
          kind: "split",
          left: { label: "هنوز نه", action: "visit_contract_no" },
          right: {
            label: "بله، قرارداد بستم",
            action: "visit_contract_yes",
            checkmark: true
          }
        },
        {
          kind: "link",
          label: "به کمک نیاز دارم؛ پشتیبان تماس بگیرد ›",
          target: "support_callback",
          icon: "chevron"
        }
      ]
    };
  }

  if (visitAwaitingCenterReview(reservation)) {
    return {
      contextLabel: visitContext(reservation),
      badge: { label: "ثبت نظر", tone: "action" },
      title: `نظر شما درباره ${center}`,
      subtitle: "تجربه ورود و تعامل مرکز تا زمان قرارداد را ثبت کنید.",
      steps,
      stepCaption,
      staffInitial: centerInitial(center),
      needsAction: true,
      actions: [
        {
          kind: "primary",
          label: "ثبت نظر",
          target: "center_review"
        },
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
    contextLabel: visitContext(reservation),
    badge: { label: "بازدید", tone: "info" },
    title: reservationStatusHint(effectiveReservationStatus(reservation)),
    subtitle: "",
    steps: baseSteps,
    stepCaption: reservationStepCaption(reservation),
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

export type VisitHomeSplitAction = "visit_contract_yes" | "visit_contract_no";
