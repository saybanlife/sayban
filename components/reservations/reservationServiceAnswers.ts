/**
 * Derive questionnaire-tab extras from a reservation's selected services.
 *
 * Service type in this product is centers__services.category:
 *   general     → عمومی
 *   specialized → تخصصی
 * (Booking UI labels; there is no separate «خصوصی» field on reservations.)
 */

import type { QuestionnaireAnswerItem } from "./questionnaireAnswers";

export type ReservationServiceRef = {
  id?: unknown;
  name?: unknown;
  category?: unknown;
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "عمومی",
  specialized: "تخصصی"
};

export function localizeServiceCategory(category: unknown): string {
  const key = String(category ?? "")
    .trim()
    .toLowerCase();
  if (!key) return "";
  return CATEGORY_LABELS[key] || String(category);
}

export function reservationServices(
  reservation: unknown
): ReservationServiceRef[] {
  if (!reservation || typeof reservation !== "object") return [];
  const services = (reservation as { services?: unknown }).services;
  if (!Array.isArray(services)) return [];
  return services.filter(
    (s): s is ReservationServiceRef =>
      !!s && typeof s === "object" && !Array.isArray(s)
  );
}

/** Comma-separated selected service names, or empty when none. */
export function formatSelectedServiceNames(reservation: unknown): string {
  const names = reservationServices(reservation)
    .map(s => String(s.name ?? "").trim())
    .filter(Boolean);
  if (names.length) return names.join("، ");

  const fallback = String(
    (reservation as { service_name?: unknown } | null)?.service_name ?? ""
  ).trim();
  return fallback;
}

/**
 * Unique localized categories from selected services.
 * One value (عمومی or تخصصی) when all match; joined when mixed.
 */
export function formatSelectedServiceType(reservation: unknown): string {
  const labels = Array.from(
    new Set(
      reservationServices(reservation)
        .map(s => localizeServiceCategory(s.category))
        .filter(Boolean)
    )
  );
  return labels.join("، ");
}

export const QUESTION_SELECTED_SERVICES = "خدمات انتخاب‌شده";
export const QUESTION_SERVICE_TYPE = "نوع خدمات";

/**
 * Synthetic answer rows prepended to the questionnaire list so they reuse the
 * same label/value row UI as real questionnaire answers.
 */
export function buildReservationServiceAnswerRows(
  reservation: unknown
): QuestionnaireAnswerItem[] {
  const services = formatSelectedServiceNames(reservation);
  const type = formatSelectedServiceType(reservation);
  const rows: QuestionnaireAnswerItem[] = [];
  if (services) {
    rows.push({
      question_text: QUESTION_SELECTED_SERVICES,
      type: "text",
      answer: services
    });
  }
  if (type) {
    rows.push({
      question_text: QUESTION_SERVICE_TYPE,
      type: "text",
      answer: type
    });
  }
  return rows;
}

export function mergeQuestionnaireWithServiceRows(
  reservation: unknown,
  answers: QuestionnaireAnswerItem[]
): QuestionnaireAnswerItem[] {
  const extras = buildReservationServiceAnswerRows(reservation);
  if (!extras.length) return answers;
  // Avoid duplicating if the blob already contains the same labels.
  const existing = new Set(
    answers.map(a => String(a.question_text ?? "").replace(/:$/, "").trim())
  );
  const unique = extras.filter(
    e => !existing.has(String(e.question_text ?? "").trim())
  );
  return [...unique, ...answers];
}
