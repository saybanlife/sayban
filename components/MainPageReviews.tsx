import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import Button from "./Button";
import EmptyPage from "./EmptyPage";
import styles from "./MainPageReviews.module.css";
import {
  panelClearCenterReviewReply,
  panelDeleteCenterReview,
  panelListCenterReviews,
  panelReplyCenterReview,
  panelReviewsErrorMessage,
  type PanelCenterReview
} from "./reviews/panelReviewsApi";
import { formatRelativeDateFa } from "./centerPage/centerHelpers";

type MainPageReviewsProps = {
  token?: string;
  className?: string;
};

const FILTERS: Array<{ value: "all" | "yes" | "no"; label: string }> = [
  { value: "all", label: "همه" },
  { value: "no", label: "بدون پاسخ" },
  { value: "yes", label: "پاسخ‌داده‌شده" }
];

function starsLabel(rating: number | null) {
  if (!rating) return "—";
  return `${"★".repeat(Math.max(0, Math.min(5, rating)))}${"☆".repeat(
    Math.max(0, 5 - Math.min(5, rating))
  )}`;
}

export function MainPageReviews({ token, className }: MainPageReviewsProps) {
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const [items, setItems] = React.useState<PanelCenterReview[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [repliedFilter, setRepliedFilter] = React.useState<"all" | "yes" | "no">(
    "all"
  );
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");

  const selected = React.useMemo(
    () => items.find(item => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await panelListCenterReviews(token, {
        q: query,
        replied: repliedFilter
      });
      if (!ok || data?.success === false) {
        toast(
          "error",
          panelReviewsErrorMessage(data?.message, "بارگذاری نظرات ناموفق بود.")
        );
        return;
      }
      const next = Array.isArray(data?.result)
        ? (data.result as PanelCenterReview[])
        : [];
      setItems(next);
      setSelectedId(current => {
        if (current && next.some(item => item.id === current)) return current;
        return next[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [token, repliedFilter, query]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  React.useEffect(() => {
    setDraft(selected?.admin_reply || "");
  }, [selected?.id, selected?.admin_reply]);

  const sendReply = async () => {
    if (!selectedId || !draft.trim()) return;
    setSaving(true);
    try {
      const { ok, data } = await panelReplyCenterReview(
        token,
        selectedId,
        draft
      );
      if (!ok || data?.success === false) {
        toast(
          "error",
          panelReviewsErrorMessage(data?.message, "ارسال پاسخ ناموفق بود.")
        );
        return;
      }
      toast("success", "پاسخ ثبت شد.");
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async () => {
    if (!selectedId) return;
    if (
      !window.confirm(
        "این نظر به‌طور کامل حذف شود؟ این عمل قابل بازگشت نیست."
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await panelDeleteCenterReview(token, selectedId);
      if (!ok || data?.success === false) {
        toast(
          "error",
          panelReviewsErrorMessage(data?.message, "حذف نظر ناموفق بود.")
        );
        return;
      }
      toast("success", "نظر حذف شد.");
      setSelectedId(null);
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const clearReply = async () => {
    if (!selectedId || !selected?.has_reply) return;
    if (!window.confirm("پاسخ این نظر حذف شود؟")) return;
    setSaving(true);
    try {
      const { ok, data } = await panelClearCenterReviewReply(token, selectedId);
      if (!ok || data?.success === false) {
        toast(
          "error",
          panelReviewsErrorMessage(data?.message, "حذف پاسخ ناموفق بود.")
        );
        return;
      }
      toast("success", "پاسخ حذف شد.");
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.title}>نظرات مرکز</div>
        <div className={styles.headerActions}>
          <Button
            color="second"
            loading={saving || loading}
            disabel={saving || loading}
            label={<span className={styles.buttonLabel}>بروزرسانی</span>}
            onClick={loadItems}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.panel}>
          <div className={styles.toolbar}>
            <div className={styles.filters}>
              {FILTERS.map(filter => (
                <button
                  key={filter.value}
                  type="button"
                  className={[
                    styles.filterChip,
                    repliedFilter === filter.value ? styles.filterChipActive : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setRepliedFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <input
              className={styles.search}
              type="search"
              value={query}
              placeholder="جستجو در نظرات…"
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") void loadItems();
              }}
            />
          </div>

          {loading ? (
            <div className={styles.loadingState}>در حال بارگذاری…</div>
          ) : !items.length ? (
            <EmptyPage className={styles.emptyPage} />
          ) : (
            <div className={styles.split}>
              <div className={styles.list} role="list">
                {items.map(item => {
                  const active = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="listitem"
                      className={[
                        styles.listItem,
                        active ? styles.listItemActive : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className={styles.listItemTop}>
                        <span className={styles.listName}>
                          {item.user_name || "کاربر بی‌نام"}
                        </span>
                        <span className={styles.listMeta}>
                          {formatRelativeDateFa(item.created_at || undefined) ||
                            "—"}
                        </span>
                      </div>
                      <div className={styles.listStars}>
                        {starsLabel(item.rating)}
                      </div>
                      <div className={styles.listPreview}>
                        {item.comment || "—"}
                      </div>
                      <div className={styles.listBadgeRow}>
                        <span
                          className={
                            item.has_reply
                              ? styles.badgeReplied
                              : styles.badgePending
                          }
                        >
                          {item.has_reply ? "پاسخ داده شده" : "بدون پاسخ"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className={styles.detail}>
                {selected ? (
                  <>
                    <div className={styles.detailHeader}>
                      <div>
                        <div className={styles.detailName}>
                          {selected.user_name || "کاربر بی‌نام"}
                        </div>
                        <div className={styles.detailMeta}>
                          {selected.user_mobile
                            ? selected.user_mobile
                            : "بدون موبایل"}{" "}
                          ·{" "}
                          {formatRelativeDateFa(
                            selected.created_at || undefined
                          ) || "—"}
                        </div>
                      </div>
                      <div className={styles.detailStars}>
                        {starsLabel(selected.rating)}
                      </div>
                    </div>

                    <div className={styles.commentBox}>
                      <div className={styles.commentLabel}>نظر کاربر</div>
                      <div className={styles.commentText}>
                        {selected.comment || "—"}
                      </div>
                    </div>

                    {selected.has_reply ? (
                      <div className={styles.replyExisting}>
                        <div className={styles.commentLabel}>پاسخ فعلی مرکز</div>
                        <div className={styles.commentText}>
                          {selected.admin_reply}
                        </div>
                        <div className={styles.replyMeta}>
                          {formatRelativeDateFa(
                            selected.admin_replied_at || undefined
                          ) || ""}
                        </div>
                      </div>
                    ) : null}

                    <div className={styles.replyEditor}>
                      <label className={styles.commentLabel} htmlFor="review-reply">
                        {selected.has_reply ? "ویرایش پاسخ" : "پاسخ دادن"}
                      </label>
                      <textarea
                        id="review-reply"
                        className={styles.textarea}
                        rows={5}
                        value={draft}
                        placeholder="پاسخ خود را بنویسید…"
                        onChange={event => setDraft(event.target.value)}
                        disabled={saving}
                      />
                      <div className={styles.replyActions}>
                        <Button
                          color="errorDestructive"
                          loading={saving}
                          disabel={saving}
                          label={
                            <span className={styles.buttonLabel}>حذف نظر</span>
                          }
                          onClick={deleteReview}
                        />
                        {selected.has_reply ? (
                          <Button
                            color="second"
                            loading={saving}
                            disabel={saving}
                            label={
                              <span className={styles.buttonLabel}>حذف پاسخ</span>
                            }
                            onClick={clearReply}
                          />
                        ) : null}
                        <Button
                          color="success"
                          loading={saving}
                          disabel={saving || !draft.trim()}
                          label={
                            <span className={styles.buttonLabel}>
                              {selected.has_reply
                                ? "به‌روزرسانی پاسخ"
                                : "ثبت پاسخ"}
                            </span>
                          }
                          onClick={sendReply}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.loadingState}>یک نظر را انتخاب کنید</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainPageReviews;
