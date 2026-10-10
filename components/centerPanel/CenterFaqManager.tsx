import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import styles from "./CenterPanelFeatures.module.css";
import Modal from "../Modal";
import { usePanelApi, type PanelFaqItem } from "./usePanelApi";
import {
  DEFAULT_CENTER_FAQ_TEMPLATES,
  normalizeFaqQuestion
} from "./defaultFaqTemplates";

type CenterFaqManagerProps = {
  centerId?: string | number;
  token?: string;
  /** Hide outer title when rendered inside tab workspace */
  compact?: boolean;
};

const emptyForm = { question: "", answer: "" };

export function CenterFaqManager({
  centerId,
  token,
  compact = false
}: CenterFaqManagerProps) {
  const api = usePanelApi(token);
  const globalActions = useGlobalActions();
  const [items, setItems] = React.useState<PanelFaqItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [templateAnswers, setTemplateAnswers] = React.useState<
    Record<string, string>
  >({});
  const [addingTemplate, setAddingTemplate] = React.useState<string | null>(
    null
  );

  const loadFaqs = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const data = await api.fetchCenterFaqs(centerId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [api, centerId]);

  React.useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const existingQuestions = React.useMemo(() => {
    return new Set(items.map(item => normalizeFaqQuestion(item.question)));
  }, [items]);

  const availableTemplates = DEFAULT_CENTER_FAQ_TEMPLATES.filter(
    question => !existingQuestions.has(normalizeFaqQuestion(question))
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const closeEditor = () => {
    resetForm();
    setEditorOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!centerId || !form.question.trim() || !form.answer.trim()) {
      globalActions?.["Fragment.showToast"]?.(
        "error",
        "سؤال و پاسخ را وارد کنید.",
        "top-center"
      );
      return;
    }

    setSaving(true);
    try {
      const ok = editingId
        ? await api.updateCenterFaq({
            id: editingId,
            question: form.question.trim(),
            answer: form.answer.trim()
          })
        : await api.createCenterFaq({
            center_id: Number(centerId),
            question: form.question.trim(),
            answer: form.answer.trim(),
            sort_order: items.length
          });

      if (ok) {
        closeEditor();
        await loadFaqs();
      }
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    resetForm();
    setEditorOpen(true);
  };

  const handleEdit = (item: PanelFaqItem) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer
    });
    setEditorOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("این سؤال حذف شود؟")) return;
    setSaving(true);
    try {
      const ok = await api.deleteCenterFaq(id);
      if (ok) {
        if (editingId === id) closeEditor();
        await loadFaqs();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplate = async (question: string) => {
    if (!centerId) return;
    const answer = (templateAnswers[question] || "").trim();
    if (!answer) {
      globalActions?.["Fragment.showToast"]?.(
        "error",
        "ابتدا پاسخ این سؤال را وارد کنید.",
        "top-center"
      );
      return;
    }

    setAddingTemplate(question);
    try {
      const ok = await api.createCenterFaq({
        center_id: Number(centerId),
        question,
        answer,
        sort_order: items.length
      });
      if (ok) {
        setTemplateAnswers(current => {
          const next = { ...current };
          delete next[question];
          return next;
        });
        await loadFaqs();
      }
    } finally {
      setAddingTemplate(null);
    }
  };

  if (!centerId) return null;

  return (
    <section className={`${styles.section}${compact ? ` ${styles.sectionCompact}` : ""}`}>
      {!compact ? (
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>سوالات متداول پروفایل</div>
            <p className={styles.sectionHint}>
              از پیش‌فرض‌ها پاسخ بدهید یا سؤال سفارشی بسازید. این سوالات در صفحه
              عمومی مرکز نمایش داده می‌شوند.
            </p>
          </div>
        </div>
      ) : (
        <p className={styles.sectionHint}>
          جدول نهایی را اینجا مدیریت کنید. قالب‌های پیش‌فرض و فرم سفارشی در پنجره
          جدا باز می‌شوند.
        </p>
      )}

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={openCreate}
          disabled={saving || loading}
        >
          سؤال سفارشی
        </button>
        {availableTemplates.length ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => setTemplatesOpen(true)}
            disabled={saving || loading}
          >
            افزودن از پیش‌فرض ({availableTemplates.length})
          </button>
        ) : null}
      </div>

      <div className={styles.list}>
        <div className={styles.fieldLabel}>
          جدول نهایی سوالات ({items.length})
        </div>
        {loading ? (
          <div className={styles.emptyState}>در حال بارگذاری...</div>
        ) : items.length ? (
          items.map(item => (
            <div className={styles.listItem} key={item.id}>
              <div className={styles.listItemTitle}>{item.question}</div>
              <div className={styles.listItemBody}>{item.answer}</div>
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => handleEdit(item)}
                  disabled={saving}
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => handleDelete(item.id)}
                  disabled={saving}
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>هنوز سؤالی ثبت نشده است.</div>
        )}
      </div>

      <Modal
        className={styles.requestModal}
        closeOnBackdropClick={true}
        content={
          <form className={styles.modalForm} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <label>
                <span className={styles.fieldLabel}>سؤال</span>
                <input
                  className={styles.input}
                  value={form.question}
                  onChange={e =>
                    setForm(current => ({
                      ...current,
                      question: e.target.value
                    }))
                  }
                  placeholder="مثلاً ساعات ملاقات چه زمانی است؟"
                  maxLength={200}
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>پاسخ</span>
                <textarea
                  className={styles.textarea}
                  value={form.answer}
                  onChange={e =>
                    setForm(current => ({ ...current, answer: e.target.value }))
                  }
                  placeholder="پاسخ کامل را اینجا بنویسید..."
                  maxLength={2000}
                />
              </label>
            </div>
            <div className={styles.actionsRow}>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={saving}
                aria-busy={saving || undefined}
              >
                {saving
                  ? "در حال ذخیره..."
                  : editingId
                    ? "ذخیره ویرایش"
                    : "افزودن سؤال"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closeEditor}
                disabled={saving}
              >
                انصراف
              </button>
            </div>
          </form>
        }
        heading={editingId ? "ویرایش سؤال" : "سؤال سفارشی"}
        isOpen={editorOpen}
        noTrigger={true}
        onOpenChange={open => {
          if (!open) closeEditor();
          else setEditorOpen(true);
        }}
        showFooter={false}
        showHeader={true}
        trigger={null}
      />

      <Modal
        className={styles.requestModal}
        closeOnBackdropClick={true}
        content={
          <div className={styles.modalForm}>
            <p className={styles.sectionHint}>
              پاسخ را بنویسید و به جدول نهایی اضافه کنید.
            </p>
            {availableTemplates.length ? (
              <div className={styles.templateList}>
                {availableTemplates.map(question => (
                  <div className={styles.templateItem} key={question}>
                    <div className={styles.templateQuestion}>{question}</div>
                    <label>
                      <span className={styles.fieldLabel}>پاسخ</span>
                      <textarea
                        className={styles.textarea}
                        value={templateAnswers[question] || ""}
                        onChange={e =>
                          setTemplateAnswers(current => ({
                            ...current,
                            [question]: e.target.value
                          }))
                        }
                        placeholder="پاسخ این سؤال را بنویسید..."
                        maxLength={2000}
                      />
                    </label>
                    <div className={styles.actionsRow}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => handleAddTemplate(question)}
                        disabled={
                          saving ||
                          loading ||
                          addingTemplate === question ||
                          !(templateAnswers[question] || "").trim()
                        }
                      >
                        {addingTemplate === question
                          ? "در حال افزودن..."
                          : "افزودن به جدول"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                همه سوالات پیش‌فرض به جدول نهایی اضافه شده‌اند.
              </div>
            )}
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setTemplatesOpen(false)}
              >
                بستن
              </button>
            </div>
          </div>
        }
        heading="سوالات پیش‌فرض"
        isOpen={templatesOpen}
        noTrigger={true}
        onOpenChange={open => setTemplatesOpen(Boolean(open))}
        showFooter={false}
        showHeader={true}
        trigger={null}
      />
    </section>
  );
}

export default CenterFaqManager;
