/**
 * Display formatting for reservation questionnaire answers.
 *
 * Answers are stored as a JSON blob in `reservations__questionnaires.answers`,
 * one element per question, shaped like the `centers__question` row plus an
 * `answer` key. The value type depends on the question `type`, so formatting has
 * to be type-aware:
 *
 *   checkbox      -> boolean, or "" when the user never touched it
 *   date / time   -> object ({ year, month, day } / { hour, minute })
 *   address       -> object ({ city, address, ... })
 *   others        -> plain string
 */

export const ANSWER_YES = "بله";
export const ANSWER_NO = "خیر";

export type QuestionnaireAnswerItem = {
  question_text?: unknown;
  type?: unknown;
  answer?: unknown;
};

function pad2(value: unknown, fallback = "00"): string {
  const text = value === undefined || value === null ? fallback : String(value);
  return text.padStart(2, "0");
}

/**
 * A checkbox answer is a real boolean, but an untouched checkbox is submitted as
 * the empty string. Both mean "not requested", so they render the same.
 */
function isCheckboxQuestion(item: QuestionnaireAnswerItem): boolean {
  return String(item?.type ?? "") === "checkbox";
}

function formatCheckbox(answer: unknown): string {
  if (answer === true || answer === "true" || answer === 1 || answer === "1") {
    return ANSWER_YES;
  }
  return ANSWER_NO;
}

function formatObject(answer: Record<string, unknown>): string {
  if ("hour" in answer) {
    return `${pad2(answer.hour)}:${pad2(answer.minute)}`;
  }
  if ("day" in answer) {
    const day = pad2(answer.day);
    const month = pad2(answer.month, "01");
    const year = answer.year ?? "";
    return year ? `${year}/${month}/${day}` : `${month}/${day}`;
  }
  if ("city" in answer || "address" in answer) {
    const city = answer.city ? String(answer.city) : "";
    const address = answer.address ? String(answer.address) : "";
    const joined = [city, address].filter(Boolean).join("، ");
    return joined || "—";
  }
  return JSON.stringify(answer);
}

/**
 * Renders one questionnaire answer as display text. Never returns a boolean,
 * which React would silently drop.
 */
export function formatQuestionnaireAnswer(
  item: QuestionnaireAnswerItem | null | undefined
): string {
  if (!item) return "";

  const answer = item.answer;

  // Must precede the falsy check: `false` and "" are meaningful for a checkbox.
  if (isCheckboxQuestion(item)) {
    return formatCheckbox(answer);
  }

  if (typeof answer === "boolean") {
    return answer ? ANSWER_YES : ANSWER_NO;
  }

  if (answer === undefined || answer === null || answer === "") {
    return "";
  }

  if (typeof answer === "object") {
    return formatObject(answer as Record<string, unknown>);
  }

  return String(answer);
}

/**
 * Question labels already end with a colon in some rows; avoid doubling it.
 */
export function formatQuestionnaireLabel(
  item: QuestionnaireAnswerItem | null | undefined
): string {
  const text = String(item?.question_text ?? "").trim();
  if (!text) return "";
  return text.endsWith(":") ? text : `${text}:`;
}

/**
 * Parses the stored `answers` blob defensively — it may arrive as a JSON string
 * or already-parsed array depending on the endpoint.
 */
export function parseQuestionnaireAnswers(
  raw: unknown
): QuestionnaireAnswerItem[] {
  if (Array.isArray(raw)) return raw as QuestionnaireAnswerItem[];
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
