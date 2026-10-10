import {
  FormQuestion,
  isQuestionActive,
  parseQuestionOptions
} from "./questionCategories";
import { normalizeChoiceOptions } from "./questionAnswerModel";

export type ShowIfRule = {
  questionId: number | null;
  option: string | null;
};

export function parseShowIfRule(question: {
  show_if_question_id?: unknown;
  show_if_option?: unknown;
}): ShowIfRule {
  const questionId = Number(question.show_if_question_id);
  const option = String(question.show_if_option ?? "").trim();
  return {
    questionId:
      Number.isInteger(questionId) && questionId > 0 ? questionId : null,
    option: option || null
  };
}

export function answerMatchesOption(
  answer: unknown,
  option: string | null | undefined
): boolean {
  const target = String(option ?? "").trim();
  if (!target) return false;
  if (Array.isArray(answer)) {
    return answer.map(item => String(item).trim()).includes(target);
  }
  if (typeof answer === "boolean") {
    if (answer) {
      return ["1", "true", "yes", "on", "بله", "checked"].includes(
        target.toLowerCase()
      );
    }
    return ["0", "false", "no", "off", "خیر"].includes(target.toLowerCase());
  }
  return String(answer ?? "").trim() === target;
}

export function getAnswerByQuestionId(
  questions: Array<{ id?: unknown }>,
  answersByIndex: Array<{ answers?: unknown } | undefined> | undefined,
  questionId: number
): unknown {
  const index = questions.findIndex(
    question => Number(question.id) === Number(questionId)
  );
  if (index < 0) return undefined;
  return answersByIndex?.[index]?.answers;
}

/**
 * Visible when there is no rule, or the parent answer matches the option.
 * Hidden parents also hide dependents (transitive). Cycles are treated as visible
 * at the cycle edge so a bad rule cannot lock the whole form.
 */
export function isQuestionVisible(
  question: {
    id?: unknown;
    is_active?: unknown;
    show_if_question_id?: unknown;
    show_if_option?: unknown;
  },
  questions: Array<{
    id?: unknown;
    is_active?: unknown;
    show_if_question_id?: unknown;
    show_if_option?: unknown;
  }>,
  getAnswer: (questionId: number) => unknown,
  visiting: Set<number> = new Set()
): boolean {
  if (!isQuestionActive(question)) return false;

  const rule = parseShowIfRule(question);
  if (!rule.questionId || !rule.option) return true;

  const selfId = Number(question.id);
  if (Number.isInteger(selfId) && selfId > 0) {
    if (visiting.has(selfId)) return true;
    visiting.add(selfId);
  }

  const parent = questions.find(
    item => Number(item.id) === Number(rule.questionId)
  );
  if (
    parent &&
    !isQuestionVisible(parent, questions, getAnswer, visiting)
  ) {
    return false;
  }

  return answerMatchesOption(getAnswer(rule.questionId), rule.option);
}

export function shouldShowCategoryHeading(
  question: FormQuestion,
  questions: FormQuestion[],
  index: number,
  isVisibleAt: (index: number) => boolean
): boolean {
  if (!isVisibleAt(index) || !question.category_title) return false;
  const categoryId = Number(question.category_id);
  if (!Number.isInteger(categoryId) || categoryId <= 0) return false;
  return !questions
    .slice(0, index)
    .some(
      (item, itemIndex) =>
        isVisibleAt(itemIndex) && Number(item.category_id) === categoryId
    );
}

export function choiceOptionsForQuestion(question: {
  type?: unknown;
  options?: unknown;
}): string[] {
  const type = String(question.type || "");
  if (type === "checkbox") return ["true", "false"];
  if (type === "single_choice" || type === "multiple_choice") {
    const normalized = normalizeChoiceOptions(question.options);
    if (normalized.length) return normalized.map(option => option.value);
    return parseQuestionOptions(question.options as FormQuestion["options"]);
  }
  return parseQuestionOptions(question.options as FormQuestion["options"]);
}

export function normalizeShowIfPayload(input: {
  show_if_question_id?: unknown;
  show_if_option?: unknown;
  id?: unknown;
}): { show_if_question_id: number | null; show_if_option: string | null } {
  const rule = parseShowIfRule(input);
  const selfId = Number(input.id);
  if (
    rule.questionId &&
    Number.isInteger(selfId) &&
    selfId > 0 &&
    rule.questionId === selfId
  ) {
    return { show_if_question_id: null, show_if_option: null };
  }
  if (!rule.questionId || !rule.option) {
    return { show_if_question_id: null, show_if_option: null };
  }
  return {
    show_if_question_id: rule.questionId,
    show_if_option: rule.option.slice(0, 255)
  };
}
