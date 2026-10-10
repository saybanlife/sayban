import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes";
import {
  PANEL_AUTH_COOKIE_NAME,
  readCookie
} from "../src/lib/authCookies";
import Button from "./Button";
import EmptyPage from "./EmptyPage";
import Modal from "./Modal";
import styles from "./MainPageHomeSlider.module.css";
import tagStyles from "./MainPageTags.module.css";

export type PanelTagItem = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
};

type MainPageTagsProps = {
  token?: string;
  className?: string;
  /** Optional seed list for local UI previews (skips initial network fetch). */
  previewItems?: PanelTagItem[];
};

async function panelRequest(
  token: string | undefined,
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function normalizeTags(raw: unknown): PanelTagItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(row => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const id = Number(item.id);
      const name = String(item.name ?? "").trim();
      if (!Number.isFinite(id) || !name) return null;
      return {
        id,
        name,
        slug: item.slug != null ? String(item.slug) : null,
        description:
          item.description != null ? String(item.description) : null
      } satisfies PanelTagItem;
    })
    .filter(Boolean) as PanelTagItem[];
}

/** Prefer Plasmic `$state.token`, fall back to panel cookie (same as other panel APIs). */
function resolvePanelToken(explicit?: string): string | undefined {
  const fromProp = String(explicit ?? "").trim();
  if (fromProp) return fromProp;
  return readCookie(PANEL_AUTH_COOKIE_NAME) || undefined;
}

function suggestSlug(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const ascii = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  // Keep Persian letters out of URL slug; fall back to timestamp if empty.
  const latin = ascii.replace(/[^\x00-\x7F]/g, "").replace(/^-+|-+$/g, "");
  return latin || `tag-${Date.now().toString(36)}`;
}

/**
 * Super Admin tag library (`/panel/tags/`).
 * List / add / delete via PANEL_ROUTES.tags* (same shell as Home Slider).
 */
export function MainPageTags({
  token,
  className,
  previewItems
}: MainPageTagsProps) {
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const authToken = resolvePanelToken(token);
  const previewMode = Array.isArray(previewItems);

  const [items, setItems] = React.useState<PanelTagItem[]>(
    previewItems ?? []
  );
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const loadItems = React.useCallback(async () => {
    if (previewMode) {
      setItems(previewItems ?? []);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { ok, data } = await panelRequest(
        authToken,
        "GET",
        PANEL_ROUTES.tags
      );
      if (!ok || data?.success === false) {
        const message = data?.message || "بارگذاری تگ‌ها ناموفق بود.";
        setLoadError(message);
        toast("error", message);
        return;
      }
      setItems(normalizeTags(data?.result));
    } finally {
      setLoading(false);
    }
  }, [authToken, previewItems, previewMode]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setNameDraft("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setNameDraft("");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = nameDraft.trim();
    if (!name) {
      toast("error", "نام تگ را وارد کنید.");
      return;
    }

    if (previewMode) {
      const nextId =
        (items.reduce((max, item) => Math.max(max, item.id), 0) || 0) + 1;
      setItems(current => [
        ...current,
        { id: nextId, name, slug: suggestSlug(name), description: null }
      ]);
      toast("success", "تگ اضافه شد.");
      closeModal();
      return;
    }

    setSaving(true);
    try {
      const { ok, data } = await panelRequest(
        authToken,
        "POST",
        PANEL_ROUTES.tagsAdd,
        {
          name,
          slug: suggestSlug(name)
        }
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "افزودن تگ ناموفق بود.");
        return;
      }
      toast("success", "تگ اضافه شد.");
      closeModal();
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("این تگ حذف شود؟ از مراکز هم جدا می‌شود.")) return;
    if (previewMode) {
      setItems(current => current.filter(item => item.id !== id));
      toast("success", "تگ حذف شد.");
      return;
    }
    setDeletingId(id);
    setSaving(true);
    try {
      const { ok, data } = await panelRequest(
        authToken,
        "POST",
        PANEL_ROUTES.tagsDelete,
        { id }
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "حذف تگ ناموفق بود.");
        return;
      }
      toast("success", "تگ حذف شد.");
      await loadItems();
    } finally {
      setDeletingId(null);
      setSaving(false);
    }
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.title}>
          تگ‌ها
          {!loading && items.length > 0 ? (
            <span className={tagStyles.countBadge}>{items.length}</span>
          ) : null}
        </div>
        <div className={styles.headerActions}>
          <Button
            color="success"
            disabled={saving || loading}
            label={<span className={styles.buttonLabel}>افزودن تگ</span>}
            onClick={openCreate}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.panel}>
          {loading ? (
            <div className={styles.loadingState}>در حال بارگذاری...</div>
          ) : loadError ? (
            <div className={tagStyles.errorState}>
              <p>{loadError}</p>
              <Button
                color="muted"
                label="تلاش دوباره"
                onClick={() => {
                  void loadItems();
                }}
              />
            </div>
          ) : items.length === 0 ? (
            <div className={tagStyles.emptyState}>
              <EmptyPage className={styles.emptyPage} />
              <p className={tagStyles.emptyHint}>
                هنوز تگی ثبت نشده. اولین تگ را اضافه کنید.
              </p>
              <Button color="success" label="افزودن تگ" onClick={openCreate} />
            </div>
          ) : (
            <>
              <div className={tagStyles.toolbar}>
                <input
                  className={tagStyles.search}
                  type="search"
                  value={search}
                  placeholder="جستجوی تگ..."
                  onChange={event => setSearch(event.target.value)}
                  aria-label="جستجوی تگ"
                />
                <button
                  type="button"
                  className={tagStyles.refreshBtn}
                  onClick={() => {
                    void loadItems();
                  }}
                  disabled={loading || saving}
                  aria-label="بازخوانی"
                  title="بازخوانی"
                >
                  ↻
                </button>
              </div>
              <div className={tagStyles.content}>
                {filtered.length === 0 ? (
                  <div className={tagStyles.emptyFilter}>
                    نتیجه‌ای برای «{search.trim()}» پیدا نشد.
                  </div>
                ) : (
                  <ul className={tagStyles.cloud} aria-label="فهرست تگ‌ها">
                    {filtered.map(item => (
                      <li key={item.id} className={tagStyles.chip}>
                        <span className={tagStyles.chipLabel} title={item.name}>
                          {item.name}
                        </span>
                        <button
                          type="button"
                          className={tagStyles.chipDelete}
                          aria-label={`حذف ${item.name}`}
                          disabled={saving}
                          onClick={() => {
                            void handleDelete(item.id);
                          }}
                        >
                          {deletingId === item.id ? "…" : "×"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        className={styles.requestModal}
        closeOnBackdropClick={!saving}
        content={
          <form className={tagStyles.modalForm} onSubmit={handleSave}>
            <label>
              <span className={tagStyles.fieldLabel}>نام تگ</span>
              <input
                className={tagStyles.input}
                value={nameDraft}
                maxLength={100}
                required
                autoFocus
                placeholder="مثلاً کمردرد"
                onChange={event => setNameDraft(event.target.value)}
              />
            </label>
            <div className={tagStyles.modalActions}>
              <Button
                color="success"
                loading={saving}
                disabel={saving}
                label="ثبت"
                submitsForm={true}
              />
              <Button
                color="muted"
                disabel={saving}
                label="لغو"
                onClick={closeModal}
              />
            </div>
          </form>
        }
        heading="افزودن تگ"
        isOpen={modalOpen}
        noTrigger={true}
        onOpenChange={open => {
          if (!open) closeModal();
          else setModalOpen(true);
        }}
        showFooter={false}
        showHeader={true}
        trigger={null}
      />
    </div>
  );
}

export default MainPageTags;
