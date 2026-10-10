import * as React from "react";
import type { DefaultMainPageQuestionProps } from "./plasmic/sayban/PlasmicMainPageQuestion";
import type { HTMLElementRefOf } from "@plasmicapp/react-web";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import {
  FormQuestion,
  QuestionCategory,
  groupQuestions,
  groupQuestionsByPage,
  isQuestionActive,
  maxFormPageInCategory,
  nextQuestionSortOrder,
  normalizeFormPage,
  parseNumberQuestionConfig,
  parseTextQuestionConfig,
  serializeTextQuestionOptions,
  planQuestionReorder
} from "./questions/questionCategories";
import {
  formatChoiceEditorLines,
  parseChoiceEditorLines
} from "./questions/questionAnswerModel";
import {
  choiceOptionsForQuestion,
  normalizeShowIfPayload,
  parseShowIfRule
} from "./questions/questionVisibility";
import styles from "./MainPageQuestion.module.css";

export interface MainPageQuestionProps extends DefaultMainPageQuestionProps {}

const QUESTION_TYPES = [
  ["text", "متنی کوتاه"],
  ["textarea", "متنی طولانی"],
  ["single_choice", "تک گزینه‌ای"],
  ["multiple_choice", "چند گزینه‌ای"],
  ["checkbox", "انتخابی"],
  ["number", "عددی"],
  ["date", "تاریخ"],
  ["time", "زمان"],
  ["address", "آدرس"]
] as const;

const TYPE_LABELS = Object.fromEntries(QUESTION_TYPES);
const EMPTY_QUESTION = {
  question_text: "",
  type: "text",
  is_required: false,
  is_active: true,
  optionsText: "",
  placeholder: "",
  helpText: "",
  minValue: "0",
  maxValue: "",
  stepValue: "1",
  category_id: "",
  form_page: "1",
  show_if_question_id: "",
  show_if_option: ""
};

function serializeQuestionOptions(options: FormQuestion["options"]): string {
  if (typeof options === "string") return options;
  return JSON.stringify(options ?? []);
}

function questionUpdateBody(
  question: FormQuestion,
  patch: Record<string, unknown> = {}
) {
  const showIf = normalizeShowIfPayload(question);
  const merged = {
    id: question.id,
    question_text: question.question_text,
    type: question.type,
    is_required: Boolean(question.is_required),
    is_active: isQuestionActive({ ...question, ...patch }) ? 1 : 0,
    options: serializeQuestionOptions(question.options),
    category_id: question.category_id ? Number(question.category_id) : null,
    show_if_question_id: showIf.show_if_question_id,
    show_if_option: showIf.show_if_option,
    sort_order: (() => {
      const parsed = Number(question.sort_order);
      return Number.isFinite(parsed) ? parsed : Number(question.id) || 0;
    })(),
    form_page: question.form_page,
    ...patch
  };
  return {
    ...merged,
    form_page: normalizeFormPage(merged.form_page)
  };
}
const EMPTY_CATEGORY = { title: "", description: "", sort_order: 0 };

type QuestionDraft = typeof EMPTY_QUESTION & { id?: number };
type CategoryDraft = typeof EMPTY_CATEGORY & { id?: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readCookie(PANEL_AUTH_COOKIE_NAME);
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "انجام عملیات ناموفق بود.");
  }
  return data as T;
}

function MainPageQuestion_(
  props: MainPageQuestionProps,
  ref: HTMLElementRefOf<"div">
) {
  const [questions, setQuestions] = React.useState<FormQuestion[]>([]);
  /** Extra empty page slots per category key (`null` = uncategorized). */
  const [extraPagesByCategory, setExtraPagesByCategory] = React.useState<
    Record<string, number>
  >({});
  const [categories, setCategories] = React.useState<QuestionCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [questionDraft, setQuestionDraft] =
    React.useState<QuestionDraft | null>(null);
  const [categoryDraft, setCategoryDraft] =
    React.useState<CategoryDraft | null>(null);
  const [notice, setNotice] = React.useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [questionData, categoryData] = await Promise.all([
        request<{ result?: FormQuestion[] }>(PANEL_ROUTES.question),
        request<{ result?: QuestionCategory[] }>(
          PANEL_ROUTES.questionCategories
        ).catch(() => ({ result: [] }))
      ]);
      setQuestions(
        Array.isArray(questionData.result) ? questionData.result : []
      );
      setCategories(
        Array.isArray(categoryData.result) ? categoryData.result : []
      );
      setNotice(null);
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "بارگذاری سؤال‌ها ناموفق بود.",
        error: true
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const groups = React.useMemo(
    () => groupQuestions(questions, categories),
    [questions, categories]
  );

  const saveQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!questionDraft?.question_text.trim() || !questionDraft.type) {
      setNotice({ text: "متن و نوع سؤال را وارد کنید.", error: true });
      return;
    }
    setSaving(true);
    try {
      const choiceOptions = parseChoiceEditorLines(questionDraft.optionsText);
      if (
        (questionDraft.type === "single_choice" ||
          questionDraft.type === "multiple_choice") &&
        choiceOptions.length < 2
      ) {
        throw new Error("برای سؤال انتخابی دست‌کم دو گزینه وارد کنید.");
      }
      const min = questionDraft.minValue === "" ? null : Number(questionDraft.minValue);
      const max = questionDraft.maxValue === "" ? null : Number(questionDraft.maxValue);
      const step = Number(questionDraft.stepValue);
      if (questionDraft.type === "number") {
        if ((min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max))) {
          throw new Error("حداقل و حداکثر باید عدد معتبر باشند.");
        }
        if (min != null && max != null && min > max) {
          throw new Error("حداکثر نمی‌تواند از حداقل کمتر باشد.");
        }
        if (!Number.isFinite(step) || step <= 0) {
          throw new Error("گام افزایش باید بزرگ‌تر از صفر باشد.");
        }
      }
      const options =
        questionDraft.type === "number"
          ? { min, max, step }
          : questionDraft.type === "text" ||
              questionDraft.type === "textarea" ||
              questionDraft.type === "address"
            ? serializeTextQuestionOptions({
                placeholder: questionDraft.placeholder,
                help: questionDraft.helpText
              })
            : choiceOptions;
      const showIf = normalizeShowIfPayload({
        id: questionDraft.id,
        show_if_question_id: questionDraft.show_if_question_id,
        show_if_option: questionDraft.show_if_option
      });
      if (
        questionDraft.show_if_question_id &&
        (!showIf.show_if_question_id || !showIf.show_if_option)
      ) {
        throw new Error(
          "برای شرط نمایش، سؤال مبنا و گزینه را کامل انتخاب کنید."
        );
      }
      if (
        showIf.show_if_question_id &&
        !questions.some(
          item => Number(item.id) === showIf.show_if_question_id
        )
      ) {
        throw new Error("سؤال مبنای شرط یافت نشد.");
      }
      await request(PANEL_ROUTES.questionUpdate, {
        method: "POST",
        body: JSON.stringify({
          ...(questionDraft.id ? { id: questionDraft.id } : {}),
          question_text: questionDraft.question_text.trim(),
          type: questionDraft.type,
          is_required: Boolean(questionDraft.is_required),
          options: JSON.stringify(options),
          category_id: questionDraft.category_id
            ? Number(questionDraft.category_id)
            : null,
          form_page: normalizeFormPage(questionDraft.form_page),
          show_if_question_id: showIf.show_if_question_id,
          show_if_option: showIf.show_if_option,
          is_active: questionDraft.is_active ? 1 : 0,
          sort_order: questionDraft.id
            ? Number(
                questions.find(item => item.id === questionDraft.id)?.sort_order
              ) || questionDraft.id
            : nextQuestionSortOrder(questions)
        })
      });
      const wasEditing = Boolean(questionDraft.id);
      setQuestionDraft(null);
      await load();
      setNotice({ text: wasEditing ? "سؤال ویرایش شد." : "سؤال جدید اضافه شد." });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error ? error.message : "ذخیره سؤال ناموفق بود.",
        error: true
      });
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryDraft?.title.trim()) {
      setNotice({ text: "عنوان دسته را وارد کنید.", error: true });
      return;
    }
    setSaving(true);
    try {
      await request(PANEL_ROUTES.questionCategoryUpdate, {
        method: "POST",
        body: JSON.stringify({
          ...(categoryDraft.id ? { id: categoryDraft.id } : {}),
          title: categoryDraft.title.trim(),
          description: categoryDraft.description.trim(),
          sort_order: Number(categoryDraft.sort_order) || 0
        })
      });
      const wasEditing = Boolean(categoryDraft.id);
      setCategoryDraft(null);
      await load();
      setNotice({ text: wasEditing ? "دسته ویرایش شد." : "دسته جدید اضافه شد." });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error ? error.message : "ذخیره دسته ناموفق بود.",
        error: true
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (question: FormQuestion) => {
    if (!window.confirm(`سؤال «${question.question_text}» حذف شود؟`)) return;
    setSaving(true);
    try {
      await request(PANEL_ROUTES.questionDelete, {
        method: "POST",
        body: JSON.stringify({ id: question.id })
      });
      await load();
      setNotice({ text: "سؤال حذف شد." });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error ? error.message : "حذف سؤال ناموفق بود.",
        error: true
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: QuestionCategory) => {
    if (
      !window.confirm(
        `دسته «${category.title}» حذف شود؟ سؤال‌های آن بدون دسته باقی می‌مانند.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await request(PANEL_ROUTES.questionCategoryDelete, {
        method: "POST",
        body: JSON.stringify({ id: category.id })
      });
      await load();
      setNotice({ text: "دسته حذف شد و سؤال‌های آن حفظ شدند." });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error ? error.message : "حذف دسته ناموفق بود.",
        error: true
      });
    } finally {
      setSaving(false);
    }
  };

  const editQuestion = (question: FormQuestion) => {
    const showIf = parseShowIfRule(question);
    const textConfig = parseTextQuestionConfig(question.options);
    setQuestionDraft({
      id: question.id,
      question_text: question.question_text || "",
      type: question.type || "text",
      is_required: Boolean(question.is_required),
      is_active: isQuestionActive(question),
      optionsText: formatChoiceEditorLines(question.options),
      placeholder: textConfig.placeholder || "",
      helpText: textConfig.help || "",
      minValue: String(parseNumberQuestionConfig(question.options).min ?? ""),
      maxValue: String(parseNumberQuestionConfig(question.options).max ?? ""),
      stepValue: String(parseNumberQuestionConfig(question.options).step ?? 1),
      category_id: question.category_id ? String(question.category_id) : "",
      form_page: String(normalizeFormPage(question.form_page)),
      show_if_question_id: showIf.questionId ? String(showIf.questionId) : "",
      show_if_option: showIf.option || ""
    });
  };

  const openNewQuestion = (categoryId: string, formPage: number) => {
    setQuestionDraft({
      ...EMPTY_QUESTION,
      category_id: categoryId,
      form_page: String(normalizeFormPage(formPage))
    });
  };

  const addPageToCategory = (categoryId: number | null) => {
    const key = categoryId == null ? "null" : String(categoryId);
    const fromQuestions = maxFormPageInCategory(questions, categoryId);
    const current = Math.max(
      fromQuestions,
      Number(extraPagesByCategory[key]) || 0,
      1
    );
    setExtraPagesByCategory(prev => ({ ...prev, [key]: current + 1 }));
  };

  const pageNumbersForGroup = (
    categoryId: number | null,
    groupQuestionsList: FormQuestion[]
  ): number[] => {
    const key = categoryId == null ? "null" : String(categoryId);
    const fromQuestions = Math.max(
      0,
      ...groupQuestionsList.map(item => normalizeFormPage(item.form_page))
    );
    const maxPage = Math.max(
      fromQuestions,
      Number(extraPagesByCategory[key]) || 0,
      1
    );
    return Array.from({ length: maxPage }, (_, index) => index + 1);
  };

  const persistQuestionFields = async (
    question: FormQuestion,
    patch: Record<string, unknown>
  ) => {
    await request(PANEL_ROUTES.questionUpdate, {
      method: "POST",
      body: JSON.stringify(questionUpdateBody(question, patch))
    });
  };

  const toggleQuestionActive = async (question: FormQuestion) => {
    setSaving(true);
    try {
      const nextActive = !isQuestionActive(question);
      await persistQuestionFields(question, { is_active: nextActive ? 1 : 0 });
      await load();
      setNotice({
        text: nextActive
          ? "سؤال در فرم فعال شد."
          : "سؤال در فرم غیرفعال شد و نمایش داده نمی‌شود."
      });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "تغییر وضعیت نمایش سؤال ناموفق بود.",
        error: true
      });
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = async (question: FormQuestion, direction: -1 | 1) => {
    const updates = planQuestionReorder(
      questions,
      categories,
      Number(question.id),
      direction
    );
    if (!updates?.length) return;
    setSaving(true);
    try {
      for (const update of updates) {
        const row = questions.find(item => Number(item.id) === update.id);
        if (!row) continue;
        await persistQuestionFields(row, { sort_order: update.sort_order });
      }
      await load();
      setNotice({ text: "ترتیب سؤال‌ها به‌روزرسانی شد." });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error ? error.message : "جابه‌جایی سؤال ناموفق بود.",
        error: true
      });
    } finally {
      setSaving(false);
    }
  };

  const showIfParentCandidates = React.useMemo(() => {
    const draftId = questionDraft?.id ? Number(questionDraft.id) : null;
    return questions.filter(question => {
      if (draftId && Number(question.id) === draftId) return false;
      const type = String(question.type || "");
      return (
        type === "single_choice" ||
        type === "multiple_choice" ||
        type === "checkbox"
      );
    });
  }, [questions, questionDraft?.id]);

  const showIfParent = React.useMemo(() => {
    const parentId = Number(questionDraft?.show_if_question_id);
    if (!Number.isInteger(parentId) || parentId <= 0) return null;
    return questions.find(question => Number(question.id) === parentId) || null;
  }, [questions, questionDraft?.show_if_question_id]);

  const showIfOptionChoices = React.useMemo(() => {
    if (!showIfParent) return [];
    return choiceOptionsForQuestion(showIfParent);
  }, [showIfParent]);

  const className = [styles.root, props.className].filter(Boolean).join(" ");
  return (
    <div ref={ref} className={className}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>سؤالات فرم خدمات</h1>
          <p className={styles.subtitle}>
            سؤال‌ها را در دسته‌های مشخص سازمان‌دهی کنید.
          </p>
        </div>
        <div className={styles.headerActions}>
          {props.rule === "super_admin" && props.addService ? (
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={props.addService}
            >
              خدمت جدید
            </button>
          ) : null}
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setCategoryDraft({ ...EMPTY_CATEGORY })}
          >
            دسته جدید
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => setQuestionDraft({ ...EMPTY_QUESTION })}
          >
            سؤال جدید
          </button>
        </div>
      </div>

      {notice ? (
        <div
          className={`${styles.notice} ${
            notice.error ? styles.noticeError : ""
          }`}
        >
          {notice.text}
        </div>
      ) : null}
      {loading ? <div className={styles.empty}>در حال بارگذاری...</div> : null}
      {!loading && groups.length === 0 ? (
        <div className={styles.empty}>هنوز سؤال یا دسته‌ای ثبت نشده است.</div>
      ) : null}

      {!loading ? (
        <div className={styles.groups}>
          {groups.map(group => (
            <section
              className={styles.categoryCard}
              key={group.category?.id || "uncategorized"}
            >
              <div className={styles.categoryHeader}>
                <div>
                  <h2 className={styles.categoryTitle}>
                    {group.category?.title || "بدون دسته"}
                    <span className={styles.count}>
                      {group.questions.length} سؤال
                    </span>
                  </h2>
                  {group.category?.description ? (
                    <p className={styles.categoryDescription}>
                      {group.category.description}
                    </p>
                  ) : null}
                </div>
                {group.category ? (
                  <div className={styles.questionActions}>
                    <button
                      className={styles.iconButton}
                      type="button"
                      onClick={() =>
                        setCategoryDraft({
                          id: group.category!.id,
                          title: group.category!.title,
                          description: group.category!.description || "",
                          sort_order: Number(group.category!.sort_order) || 0
                        })
                      }
                    >
                      ویرایش دسته
                    </button>
                    <button
                      className={styles.dangerButton}
                      type="button"
                      disabled={saving}
                      onClick={() => void deleteCategory(group.category!)}
                    >
                      حذف دسته
                    </button>
                  </div>
                ) : null}
              </div>
              <div className={styles.questionList}>
                {(() => {
                  const categoryId = group.category?.id ?? null;
                  const pagesByNumber = new Map(
                    groupQuestionsByPage(group.questions).map(pageGroup => [
                      pageGroup.page,
                      pageGroup.questions
                    ])
                  );
                  const pageNumbers = pageNumbersForGroup(
                    categoryId,
                    group.questions
                  );
                  return (
                    <>
                      {pageNumbers.map(page => {
                        const pageQuestions = pagesByNumber.get(page) || [];
                        return (
                          <div className={styles.pageBlock} key={page}>
                            <div className={styles.pageHeader}>
                              <h3 className={styles.pageTitle}>
                                Page {page}
                                <span className={styles.count}>
                                  {pageQuestions.length} سؤال
                                </span>
                              </h3>
                              <button
                                className={styles.iconButton}
                                type="button"
                                onClick={() =>
                                  openNewQuestion(
                                    categoryId == null ? "" : String(categoryId),
                                    page
                                  )
                                }
                              >
                                سؤال در این صفحه
                              </button>
                            </div>
                            {pageQuestions.length ? (
                              pageQuestions.map(question => (
                                <div
                                  className={`${styles.questionRow} ${
                                    !isQuestionActive(question)
                                      ? styles.questionRowInactive
                                      : ""
                                  }`}
                                  key={question.id}
                                >
                                  <div>
                                    <div className={styles.questionText}>
                                      {question.question_text}
                                    </div>
                                    <div className={styles.meta}>
                                      <span className={styles.tag}>
                                        {TYPE_LABELS[
                                          question.type as keyof typeof TYPE_LABELS
                                        ] || question.type}
                                      </span>
                                      {question.is_required ? (
                                        <span className={styles.tag}>اجباری</span>
                                      ) : null}
                                      {(() => {
                                        const showIf = parseShowIfRule(question);
                                        if (!showIf.questionId) return null;
                                        return (
                                          <span className={styles.tag}>
                                            شرطی
                                            {showIf.option
                                              ? `: ${showIf.option}`
                                              : ""}
                                          </span>
                                        );
                                      })()}
                                      {!isQuestionActive(question) ? (
                                        <span className={styles.tagMuted}>
                                          غیرفعال در فرم
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className={styles.questionActions}>
                                    <button
                                      className={styles.iconButton}
                                      type="button"
                                      disabled={saving}
                                      title="بالاتر"
                                      aria-label="بالاتر"
                                      onClick={() =>
                                        void moveQuestion(question, -1)
                                      }
                                    >
                                      ↑
                                    </button>
                                    <button
                                      className={styles.iconButton}
                                      type="button"
                                      disabled={saving}
                                      title="پایین‌تر"
                                      aria-label="پایین‌تر"
                                      onClick={() =>
                                        void moveQuestion(question, 1)
                                      }
                                    >
                                      ↓
                                    </button>
                                    <button
                                      className={styles.iconButton}
                                      type="button"
                                      disabled={saving}
                                      onClick={() =>
                                        void toggleQuestionActive(question)
                                      }
                                    >
                                      {isQuestionActive(question)
                                        ? "غیرفعال در فرم"
                                        : "فعال در فرم"}
                                    </button>
                                    <button
                                      className={styles.iconButton}
                                      type="button"
                                      onClick={() => editQuestion(question)}
                                    >
                                      ویرایش
                                    </button>
                                    <button
                                      className={styles.dangerButton}
                                      type="button"
                                      disabled={saving}
                                      onClick={() =>
                                        void deleteQuestion(question)
                                      }
                                    >
                                      حذف
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className={styles.pageEmpty}>
                                هنوز سؤالی در این صفحه نیست.
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className={styles.pageFooter}>
                        <button
                          className={styles.secondaryButton}
                          type="button"
                          onClick={() => addPageToCategory(categoryId)}
                        >
                          افزودن Page جدید
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {questionDraft ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setQuestionDraft(null);
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-dialog-title"
          >
            <h2 className={styles.dialogTitle} id="question-dialog-title">
              {questionDraft.id ? "ویرایش سؤال" : "افزودن سؤال جدید"}
            </h2>
            <form className={styles.form} onSubmit={saveQuestion}>
              <label className={styles.field}>
                متن سؤال
                <input
                  className={styles.input}
                  value={questionDraft.question_text}
                  maxLength={2000}
                  onChange={event =>
                    setQuestionDraft({
                      ...questionDraft,
                      question_text: event.target.value
                    })
                  }
                  autoFocus
                />
              </label>
              <label className={styles.field}>
                دسته
                <select
                  className={styles.select}
                  value={questionDraft.category_id}
                  onChange={event =>
                    setQuestionDraft({
                      ...questionDraft,
                      category_id: event.target.value
                    })
                  }
                >
                  <option value="">بدون دسته</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Page (درون همین دسته)
                <select
                  className={styles.select}
                  value={questionDraft.form_page}
                  onChange={event =>
                    setQuestionDraft({
                      ...questionDraft,
                      form_page: event.target.value
                    })
                  }
                >
                  {(() => {
                    const categoryId = questionDraft.category_id
                      ? Number(questionDraft.category_id)
                      : null;
                    const key =
                      categoryId == null || !Number.isInteger(categoryId)
                        ? "null"
                        : String(categoryId);
                    const maxPage = Math.max(
                      maxFormPageInCategory(
                        questions,
                        categoryId != null && Number.isInteger(categoryId)
                          ? categoryId
                          : null
                      ),
                      Number(extraPagesByCategory[key]) || 0,
                      normalizeFormPage(questionDraft.form_page),
                      1
                    );
                    return Array.from({ length: maxPage }, (_, index) => {
                      const page = index + 1;
                      return (
                        <option key={page} value={String(page)}>
                          Page {page}
                        </option>
                      );
                    });
                  })()}
                </select>
              </label>
              <label className={styles.field}>
                نوع پاسخ
                <select
                  className={styles.select}
                  value={questionDraft.type}
                  onChange={event =>
                    setQuestionDraft({
                      ...questionDraft,
                      type: event.target.value
                    })
                  }
                >
                  {QUESTION_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {questionDraft.type === "text" ||
              questionDraft.type === "textarea" ||
              questionDraft.type === "address" ? (
                <>
                  {questionDraft.type === "text" ||
                  questionDraft.type === "textarea" ? (
                    <label className={styles.field}>
                      Placeholder
                      <input
                        className={styles.input}
                        value={questionDraft.placeholder}
                        maxLength={500}
                        placeholder="مثلاً دیابت دارد..."
                        onChange={event =>
                          setQuestionDraft({
                            ...questionDraft,
                            placeholder: event.target.value
                          })
                        }
                      />
                    </label>
                  ) : null}
                  {questionDraft.type === "textarea" ||
                  questionDraft.type === "address" ? (
                    <label className={styles.field}>
                      متن راهنما (اختیاری)
                      <textarea
                        className={styles.textarea}
                        value={questionDraft.helpText}
                        maxLength={1000}
                        placeholder="توضیح کوتاه زیر عنوان سؤال"
                        onChange={event =>
                          setQuestionDraft({
                            ...questionDraft,
                            helpText: event.target.value
                          })
                        }
                      />
                    </label>
                  ) : null}
                </>
              ) : null}
              {questionDraft.type === "single_choice" ||
              questionDraft.type === "multiple_choice" ? (
                <label className={styles.field}>
                  گزینه‌ها
                  <textarea
                    className={styles.textarea}
                    value={questionDraft.optionsText}
                    onChange={event =>
                      setQuestionDraft({
                        ...questionDraft,
                        optionsText: event.target.value
                      })
                    }
                    placeholder="هر گزینه در یک خط؛ توضیح اختیاری بعد از |"
                  />
                </label>
              ) : null}
              {questionDraft.type === "number" ? (
                <div className={styles.numberRules}>
                  <label className={styles.field}>
                    حداقل
                    <input
                      className={styles.input}
                      type="number"
                      value={questionDraft.minValue}
                      onChange={event =>
                        setQuestionDraft({
                          ...questionDraft,
                          minValue: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    حداکثر
                    <input
                      className={styles.input}
                      type="number"
                      value={questionDraft.maxValue}
                      onChange={event =>
                        setQuestionDraft({
                          ...questionDraft,
                          maxValue: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    گام افزایش
                    <input
                      className={styles.input}
                      type="number"
                      min="0.000001"
                      step="any"
                      value={questionDraft.stepValue}
                      onChange={event =>
                        setQuestionDraft({
                          ...questionDraft,
                          stepValue: event.target.value
                        })
                      }
                    />
                  </label>
                </div>
              ) : null}
              <div className={styles.conditionBox}>
                <div className={styles.conditionTitle}>شرط نمایش</div>
                <p className={styles.conditionHint}>
                  اگر سؤال مبنا گزینه مشخصی داشته باشد، این سؤال نمایش داده می‌شود.
                </p>
                <label className={styles.field}>
                  سؤال مبنا
                  <select
                    className={styles.select}
                    value={questionDraft.show_if_question_id}
                    onChange={event =>
                      setQuestionDraft({
                        ...questionDraft,
                        show_if_question_id: event.target.value,
                        show_if_option: ""
                      })
                    }
                  >
                    <option value="">همیشه نمایش داده شود</option>
                    {showIfParentCandidates.map(question => (
                      <option key={question.id} value={question.id}>
                        {question.question_text}
                      </option>
                    ))}
                  </select>
                </label>
                {questionDraft.show_if_question_id ? (
                  <label className={styles.field}>
                    گزینه مورد نیاز
                    {showIfOptionChoices.length ? (
                      <select
                        className={styles.select}
                        value={questionDraft.show_if_option}
                        onChange={event =>
                          setQuestionDraft({
                            ...questionDraft,
                            show_if_option: event.target.value
                          })
                        }
                      >
                        <option value="">انتخاب گزینه</option>
                        {showIfOptionChoices.map(option => (
                          <option key={option} value={option}>
                            {option === "true"
                              ? "فعال / بله"
                              : option === "false"
                                ? "غیرفعال / خیر"
                                : option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={styles.input}
                        value={questionDraft.show_if_option}
                        onChange={event =>
                          setQuestionDraft({
                            ...questionDraft,
                            show_if_option: event.target.value
                          })
                        }
                        placeholder="مقدار گزینه"
                      />
                    )}
                  </label>
                ) : null}
              </div>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={Boolean(questionDraft.is_active)}
                  onChange={event =>
                    setQuestionDraft({
                      ...questionDraft,
                      is_active: event.target.checked
                    })
                  }
                />
                در فرم رزرو نمایش داده شود
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={Boolean(questionDraft.is_required)}
                  onChange={event =>
                    setQuestionDraft({
                      ...questionDraft,
                      is_required: event.target.checked
                    })
                  }
                />
                این سؤال اجباری است
              </label>
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setQuestionDraft(null)}
                >
                  انصراف
                </button>
                <button
                  className={styles.button}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "در حال ذخیره..." : "ذخیره"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {categoryDraft ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setCategoryDraft(null);
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
          >
            <h2 className={styles.dialogTitle} id="category-dialog-title">
              {categoryDraft.id ? "ویرایش دسته" : "افزودن دسته جدید"}
            </h2>
            <form className={styles.form} onSubmit={saveCategory}>
              <label className={styles.field}>
                عنوان دسته
                <input
                  className={styles.input}
                  value={categoryDraft.title}
                  maxLength={120}
                  onChange={event =>
                    setCategoryDraft({
                      ...categoryDraft,
                      title: event.target.value
                    })
                  }
                  autoFocus
                />
              </label>
              <label className={styles.field}>
                توضیحات دسته
                <textarea
                  className={styles.textarea}
                  value={categoryDraft.description}
                  maxLength={1000}
                  onChange={event =>
                    setCategoryDraft({
                      ...categoryDraft,
                      description: event.target.value
                    })
                  }
                />
              </label>
              <label className={styles.field}>
                ترتیب نمایش
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={categoryDraft.sort_order}
                  onChange={event =>
                    setCategoryDraft({
                      ...categoryDraft,
                      sort_order: Number(event.target.value) || 0
                    })
                  }
                />
              </label>
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setCategoryDraft(null)}
                >
                  انصراف
                </button>
                <button
                  className={styles.button}
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "در حال ذخیره..." : "ذخیره"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const MainPageQuestion = React.forwardRef(MainPageQuestion_);
export default MainPageQuestion;
