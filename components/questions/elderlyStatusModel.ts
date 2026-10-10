/**
 * «وضعیت سالمند» answers are stored per elderly User (not per reservation).
 */

import {
  FormQuestion,
  categoryKeyOf,
  isQuestionRequired,
  normalizeFormPage
} from "./questionCategories";
import { isQuestionVisible } from "./questionVisibility";

export const ELDERLY_STATUS_CATEGORY_TITLE = "وضعیت سالمند";

export function isElderlyStatusQuestion(question: {
  category_title?: unknown;
  category_id?: unknown;
}): boolean {
  const title = String(question.category_title || "").trim();
  if (title === ELDERLY_STATUS_CATEGORY_TITLE) return true;
  // Fallback if title missing but category id known from DB seed.
  return Number(question.category_id) === 3 && !title;
}

export function filterElderlyStatusQuestions(
  questions: FormQuestion[]
): FormQuestion[] {
  return questions.filter(isElderlyStatusQuestion);
}

export function filterNonElderlyStatusQuestions(
  questions: FormQuestion[]
): FormQuestion[] {
  return questions.filter(question => !isElderlyStatusQuestion(question));
}

export function serializeElderlyAnswer(answer: unknown): string {
  if (answer == null) return "";
  if (typeof answer === "string") return answer;
  try {
    return JSON.stringify(answer);
  } catch {
    return String(answer);
  }
}

export function parseElderlyAnswer(raw: unknown): unknown {
  if (raw == null) return "";
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function isAnswerFilled(answer: unknown): boolean {
  if (answer == null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "boolean") return true;
  if (typeof answer === "object") {
    return Object.values(answer as Record<string, unknown>).some(value =>
      String(value ?? "").trim()
    );
  }
  return String(answer).trim().length > 0;
}

/**
 * Complete when every currently-visible *required* elderly-status question
 * has an answer. Optional and hidden conditional questions are ignored.
 */
export function isElderlyStatusComplete(
  questions: FormQuestion[],
  answersByQuestionId: Map<number, unknown> | Record<number, unknown>,
  getAnswer?: (questionId: number) => unknown
): boolean {
  const elderly = filterElderlyStatusQuestions(questions);
  if (!elderly.length) return true;

  const lookup = (questionId: number) => {
    if (getAnswer) return getAnswer(questionId);
    if (answersByQuestionId instanceof Map) {
      return answersByQuestionId.get(questionId);
    }
    return answersByQuestionId[questionId];
  };

  const allQuestions = questions;
  for (const question of elderly) {
    if (!isQuestionRequired(question)) continue;
    const visible = isQuestionVisible(question, allQuestions, id =>
      lookup(Number(id))
    );
    if (!visible) continue;
    if (!isAnswerFilled(lookup(Number(question.id)))) return false;
  }
  return true;
}

export function answersMapFromRows(
  rows: Array<{ question_id?: unknown; answer?: unknown }>
): Map<number, unknown> {
  const map = new Map<number, unknown>();
  for (const row of rows) {
    const id = Number(row.question_id);
    if (!Number.isInteger(id) || id <= 0) continue;
    map.set(id, parseElderlyAnswer(row.answer));
  }
  return map;
}

export function buildElderlyStatusSavePayload(
  questions: FormQuestion[],
  answersByIndex: Array<{ answers?: unknown } | undefined>
): Array<{ question_id: number; answer: string }> {
  const payload: Array<{ question_id: number; answer: string }> = [];
  questions.forEach((question, index) => {
    if (!isElderlyStatusQuestion(question)) return;
    const id = Number(question.id);
    if (!Number.isInteger(id) || id <= 0) return;
    payload.push({
      question_id: id,
      answer: serializeElderlyAnswer(answersByIndex[index]?.answers)
    });
  });
  return payload;
}

export function resolveElderlyForUserId(input: {
  recipientMode?: "self" | "other" | null;
  companion?: {
    linked_user_id?: unknown;
    for_user_id?: unknown;
    id?: unknown;
  } | null;
  profile?: unknown;
}): number | null {
  if (input.recipientMode === "other") {
    const linked = Number(
      input.companion?.linked_user_id ?? input.companion?.for_user_id
    );
    return Number.isInteger(linked) && linked > 0 ? linked : null;
  }
  if (!input.profile || typeof input.profile !== "object") return null;
  const id = Number((input.profile as Record<string, unknown>).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Keep sort helpers available to callers grouping elderly pages. */
export function elderlyStatusSortKey(question: FormQuestion) {
  return [
    normalizeFormPage(question.form_page),
    Number(question.sort_order) || 0,
    Number(question.id) || 0,
    categoryKeyOf(question) || 0
  ] as const;
}

/** Short card labels for the post-duration confirmation step. */
export function elderlySummaryLabel(question: {
  question_text?: unknown;
  type?: unknown;
}): string {
  const text = String(question.question_text || "").trim();
  if (/راه|حرکت|واکر|ویلچر|راه\s*می/.test(text)) return "وضعیت حرکتی";
  if (/پوشک/.test(text)) return "پوشک";
  if (/بیماری|مشکل\s*خاص/.test(text)) return "بیماری‌ها";
  if (/آدرس/.test(text)) return "آدرس";
  return text.replace(/[؟?]+$/g, "").trim() || "مورد";
}

export function formatElderlyAnswerDisplay(answer: unknown): string {
  if (answer == null) return "";
  if (Array.isArray(answer)) {
    return answer
      .map(item => String(item ?? "").trim())
      .filter(Boolean)
      .join("، ");
  }
  if (typeof answer === "boolean") return answer ? "دارد" : "ندارد";
  if (typeof answer === "object") {
    return Object.values(answer as Record<string, unknown>)
      .map(item => String(item ?? "").trim())
      .filter(Boolean)
      .join("، ");
  }
  return String(answer).trim();
}

export type ElderlySummaryRow = {
  key: string;
  label: string;
  value: string;
  questionId?: number;
};

/**
 * Visible elderly-status answers for the confirmation card.
 * Skips empty/hidden rows and free-text follow-ups folded into disease.
 */
export function buildElderlySummaryRows(
  questions: FormQuestion[],
  answersByQuestionId: Map<number, unknown> | Record<number, unknown>,
  options?: { addressLine?: string | null }
): ElderlySummaryRow[] {
  const lookup = (questionId: number) => {
    if (answersByQuestionId instanceof Map) {
      return answersByQuestionId.get(questionId);
    }
    return answersByQuestionId[questionId];
  };

  const rows: ElderlySummaryRow[] = [];
  for (const question of filterElderlyStatusQuestions(questions)) {
    const id = Number(question.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    const visible = isQuestionVisible(question, questions, qid =>
      lookup(Number(qid))
    );
    if (!visible) continue;
    // Skip open follow-up textarea; primary disease choice is enough.
    if (String(question.type) === "textarea") continue;
    const value = formatElderlyAnswerDisplay(lookup(id));
    if (!value) continue;
    rows.push({
      key: `q-${id}`,
      label: elderlySummaryLabel(question),
      value,
      questionId: id
    });
  }

  const address = String(options?.addressLine || "").trim();
  if (address) {
    rows.push({
      key: "address",
      label: "آدرس",
      value: address
    });
  }
  return rows;
}
