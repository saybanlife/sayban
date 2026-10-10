export type QuestionCategory = {
  id: number;
  title: string;
  description?: string | null;
  sort_order?: number | null;
  questions?: FormQuestion[];
};

export type NumberQuestionConfig = {
  min?: number | null;
  max?: number | null;
  step?: number | null;
};

export type TextQuestionConfig = {
  placeholder?: string | null;
  help?: string | null;
};

export type FormQuestion = {
  id: number;
  question_text: string;
  type: string;
  is_required?: boolean | number | null;
  /** 1/true (default) = shown in reservation form; 0/false = hidden. */
  is_active?: boolean | number | null;
  sort_order?: number | string | null;
  /**
   * Form page within the question's category (independent per category).
   * Not the number-input `options.step`.
   */
  form_page?: number | string | null;
  options?: string | string[] | NumberQuestionConfig | TextQuestionConfig | null;
  /** Optional direct placeholder; otherwise read from options for text/textarea. */
  placeholder?: string | null;
  category_id?: number | string | null;
  category_title?: string | null;
  category_description?: string | null;
  category_sort_order?: number | null;
  category_first?: boolean;
  page_first?: boolean;
  /** When set with show_if_option, question is shown only if that parent answer matches. */
  show_if_question_id?: number | string | null;
  show_if_option?: string | null;
  [key: string]: unknown;
};

/** Page number within a category; always ≥ 1. */
export function normalizeFormPage(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(1000, Math.floor(parsed));
}

export function categoryKeyOf(question: {
  category_id?: unknown;
}): number | null {
  const categoryId = Number(question.category_id);
  return Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
}

export function compareFormPageOrder(
  a: { form_page?: unknown; sort_order?: unknown; id?: unknown },
  b: { form_page?: unknown; sort_order?: unknown; id?: unknown }
): number {
  const pageDiff = normalizeFormPage(a.form_page) - normalizeFormPage(b.form_page);
  if (pageDiff !== 0) return pageDiff;
  return compareQuestionOrder(a, b);
}

export function isQuestionActive(question: {
  is_active?: unknown;
}): boolean {
  const value = question.is_active;
  if (value === false || value === 0 || value === "0") return false;
  return true;
}

/**
 * Coerce API/DB `is_required` (0/1/"0"/"1"/bool).
 * Avoid `Boolean("0") === true`.
 */
export function isQuestionRequired(question: {
  is_required?: unknown;
}): boolean {
  const value = question.is_required;
  if (value === true || value === 1 || value === "1") return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "بله" ||
      normalized === "آری"
    );
  }
  return false;
}

export function compareQuestionOrder(
  a: { sort_order?: unknown; id?: unknown },
  b: { sort_order?: unknown; id?: unknown }
): number {
  const sortA = Number(a.sort_order);
  const sortB = Number(b.sort_order);
  const safeA = Number.isFinite(sortA) ? sortA : Number.MAX_SAFE_INTEGER;
  const safeB = Number.isFinite(sortB) ? sortB : Number.MAX_SAFE_INTEGER;
  if (safeA !== safeB) return safeA - safeB;
  return Number(a.id) - Number(b.id);
}

export function nextQuestionSortOrder(
  questions: Array<{ sort_order?: unknown }>
): number {
  let max = 0;
  for (const question of questions) {
    const value = Number(question.sort_order);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max + 1;
}

export type QuestionGroup = {
  category: QuestionCategory | null;
  questions: FormQuestion[];
};

export function parseQuestionOptions(value: FormQuestion["options"]): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map(item => item.trim()).filter(Boolean);
  }
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map(String).map(item => item.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function parseNumberQuestionConfig(
  value: FormQuestion["options"]
): NumberQuestionConfig {
  let parsed: unknown = value;
  if (typeof value === "string" && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
  const source = parsed as Record<string, unknown>;
  const finite = (candidate: unknown) => {
    if (candidate === "" || candidate === null || candidate === undefined) {
      return null;
    }
    const number = Number(candidate);
    return Number.isFinite(number) ? number : null;
  };
  return {
    min: finite(source.min),
    max: finite(source.max),
    step: finite(source.step)
  };
}

/** Placeholder / help for short text and long textarea questions. */
export function parseTextQuestionConfig(
  value: FormQuestion["options"]
): TextQuestionConfig {
  let parsed: unknown = value;
  if (typeof value === "string" && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    return {};
  }
  const source = parsed as Record<string, unknown>;
  const placeholder = String(source.placeholder ?? "").trim();
  const help = String(source.help ?? source.description ?? "").trim();
  return {
    placeholder: placeholder || null,
    help: help || null
  };
}

export function serializeTextQuestionOptions(input: {
  placeholder?: string | null;
  help?: string | null;
}): TextQuestionConfig {
  const placeholder = String(input.placeholder ?? "").trim();
  const help = String(input.help ?? "").trim();
  return {
    ...(placeholder ? { placeholder } : {}),
    ...(help ? { help } : {})
  };
}

export function groupQuestions(
  questions: FormQuestion[],
  categories: QuestionCategory[]
): QuestionGroup[] {
  const byId = new Map<number, FormQuestion[]>();
  const uncategorized: FormQuestion[] = [];

  for (const question of questions) {
    const categoryId = Number(question.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      uncategorized.push(question);
      continue;
    }
    const rows = byId.get(categoryId) || [];
    rows.push(question);
    byId.set(categoryId, rows);
  }

  const sortedCategories = [...categories].sort(
    (a, b) =>
      Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.id - b.id
  );
  const groups: QuestionGroup[] = sortedCategories.map(category => ({
    category,
    questions: [...(byId.get(category.id) || [])].sort(compareFormPageOrder)
  }));

  byId.forEach((rows, categoryId) => {
    if (!sortedCategories.some(category => category.id === categoryId)) {
      uncategorized.push(...rows);
    }
  });
  if (uncategorized.length) {
    groups.push({
      category: null,
      questions: [...uncategorized].sort(compareFormPageOrder)
    });
  }
  return groups;
}

export type QuestionPageGroup = {
  page: number;
  questions: FormQuestion[];
};

/** Split a category's questions into ordered page buckets (pages with no questions omitted). */
export function groupQuestionsByPage(
  questions: FormQuestion[]
): QuestionPageGroup[] {
  const byPage = new Map<number, FormQuestion[]>();
  for (const question of questions) {
    const page = normalizeFormPage(question.form_page);
    const rows = byPage.get(page) || [];
    rows.push(question);
    byPage.set(page, rows);
  }
  const pageNumbers: number[] = [];
  byPage.forEach((_rows, page) => {
    pageNumbers.push(page);
  });
  pageNumbers.sort((a, b) => a - b);
  return pageNumbers.map(page => ({
    page,
    questions: (byPage.get(page) || []).slice().sort(compareQuestionOrder)
  }));
}

/** Highest form_page in a category (0 if none). */
export function maxFormPageInCategory(
  questions: FormQuestion[],
  categoryId: number | null
): number {
  let max = 0;
  for (const question of questions) {
    if (categoryKeyOf(question) !== categoryId) continue;
    max = Math.max(max, normalizeFormPage(question.form_page));
  }
  return max;
}

export type FormPageStep = {
  categoryId: number | null;
  categoryTitle: string;
  page: number;
  indexes: number[];
};

/**
 * Build form wizard steps: one step per (category, page) that still has visible questions.
 * Page numbers restart per category by construction.
 */
export function buildFormPageSteps(
  questions: FormQuestion[],
  isVisibleAt: (index: number) => boolean
): FormPageStep[] {
  const steps: FormPageStep[] = [];
  for (let index = 0; index < questions.length; index += 1) {
    if (!isVisibleAt(index)) continue;
    const question = questions[index];
    const categoryId = categoryKeyOf(question);
    const page = normalizeFormPage(question.form_page);
    const last = steps[steps.length - 1];
    if (
      last &&
      last.categoryId === categoryId &&
      last.page === page
    ) {
      last.indexes.push(index);
      continue;
    }
    steps.push({
      categoryId,
      categoryTitle:
        String(question.category_title || "").trim() ||
        (categoryId == null ? "سایر" : "دسته‌بندی"),
      page,
      indexes: [index]
    });
  }
  return steps;
}

/** Move a question within its category+page group; returns rows whose sort_order changes. */
export function planQuestionReorder(
  questions: FormQuestion[],
  categories: QuestionCategory[],
  questionId: number,
  direction: -1 | 1
): Array<{ id: number; sort_order: number }> | null {
  const groups = groupQuestions(questions, categories);
  for (const group of groups) {
    const targetQuestion = group.questions.find(
      item => Number(item.id) === Number(questionId)
    );
    if (!targetQuestion) continue;
    const page = normalizeFormPage(targetQuestion.form_page);
    const pageQuestions = group.questions.filter(
      item => normalizeFormPage(item.form_page) === page
    );
    const index = pageQuestions.findIndex(
      item => Number(item.id) === Number(questionId)
    );
    if (index < 0) continue;
    const target = index + direction;
    if (target < 0 || target >= pageQuestions.length) return null;
    const next = [...pageQuestions];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const updates: Array<{ id: number; sort_order: number }> = [];
    next.forEach((question, orderIndex) => {
      const sort_order = (orderIndex + 1) * 10;
      if (Number(question.sort_order) !== sort_order) {
        updates.push({ id: Number(question.id), sort_order });
      }
    });
    return updates.length ? updates : null;
  }
  return null;
}

