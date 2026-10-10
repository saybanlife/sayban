import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { resolveApiUrl } from "../src/lib/apiRoutes";
import { uploadPanelImage } from "../src/lib/panelLiomUpload";
import Button from "./Button";
import EmptyPage from "./EmptyPage";
import Modal from "./Modal";
import StaffsItem from "./StaffsItem";
import styles from "./MainPageHomeSlider.module.css";
import {
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_UPLOAD_MB,
  describeDimensionRejection,
  describeImageRejection,
  readImageDimensions
} from "./uploadLimits";
import type {
  HomeSliderForm,
  HomeSliderItem
} from "./homeSlider/homeSliderTypes";

/**
 * The public slider renders each slide as a full-bleed wide banner
 * (`components/Home.tsx`), so anything close to square is cropped badly.
 */
const SLIDE_DIMENSION_RULES = {
  minWidth: 640,
  minHeight: 240,
  maxWidth: 4000,
  maxHeight: 2000,
  aspectRatio: 16 / 6,
  aspectRatioTolerance: 0.55,
  aspectRatioLabel: "۱۶:۹"
};

type MainPageHomeSliderProps = {
  token?: string;
  className?: string;
};

const EMPTY_FORM: HomeSliderForm = {
  image_url: "",
  action: "",
  is_active: true,
  sort_order: 0
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

function existingImageUrl(files: any[], fallback = ""): string {
  const first = files?.[0];
  if (typeof first === "string") return first.trim();
  if (first && typeof first === "object" && typeof first.url === "string") {
    return first.url.trim();
  }
  return fallback.trim();
}

export function MainPageHomeSlider({
  token,
  className
}: MainPageHomeSliderProps) {
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const [items, setItems] = React.useState<HomeSliderItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<HomeSliderForm>(EMPTY_FORM);
  const [uploadFiles, setUploadFiles] = React.useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [checkingImage, setCheckingImage] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  /** Validates format/size/dimensions, uploads file directly to Liom, keeps CDN URL. */
  const handlePickImage = async (file: File | null) => {
    if (!file) return;
    setCheckingImage(true);
    try {
      const basic = describeImageRejection(file);
      if (basic) {
        toast("error", basic);
        return;
      }
      const dimensions = await readImageDimensions(file).catch(() => null);
      if (!dimensions) {
        toast("error", "تصویر قابل خواندن نیست یا فرمت آن پشتیبانی نمی‌شود.");
        return;
      }
      const dimensionIssue = describeDimensionRejection(
        dimensions,
        SLIDE_DIMENSION_RULES
      );
      if (dimensionIssue) {
        toast("error", dimensionIssue);
        return;
      }
      const url = await uploadPanelImage(file, { token });
      setUploadFiles([{ url }]);
      setPreviewUrl(url);
      setForm(current => ({ ...current, image_url: url }));
    } catch (error) {
      toast(
        "error",
        error instanceof Error ? error.message : "آپلود تصویر ناموفق بود."
      );
    } finally {
      setCheckingImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const selected = React.useMemo(
    () => items.find(item => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await panelRequest(
        token,
        "GET",
        "panel/home-sliders"
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "بارگذاری اسلایدرها ناموفق بود.");
        return;
      }
      const next = Array.isArray(data?.result) ? data.result : [];
      setItems(next);
      setSelectedId(current => {
        if (current && next.some((item: HomeSliderItem) => item.id === current)) {
          return current;
        }
        return next[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      sort_order: items.length
        ? Math.max(...items.map(item => item.sort_order ?? 0)) + 1
        : 0
    });
    setUploadFiles([]);
    setPreviewUrl("");
    setModalOpen(true);
  };

  const openEdit = (item: HomeSliderItem) => {
    setEditingId(item.id);
    setForm({
      image_url: item.image_url,
      action: item.action ?? "",
      is_active: Number(item.is_active) !== 0,
      sort_order: item.sort_order ?? 0
    });
    setUploadFiles(item.image_url ? [item.image_url] : []);
    setPreviewUrl(item.image_url || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setUploadFiles([]);
    setPreviewUrl("");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const imageUrl = existingImageUrl(uploadFiles, form.image_url);
    if (!imageUrl) {
      toast("error", "تصویر بنر را انتخاب کنید.");
      return;
    }

    setSaving(true);
    try {
      const path = editingId
        ? "panel/home-sliders/update"
        : "panel/home-sliders/add";
      const body: Record<string, unknown> = {
        ...(editingId ? { id: editingId } : {}),
        action: form.action,
        is_active: form.is_active,
        sort_order: form.sort_order,
        image_url: imageUrl,
        image: null
      };
      const { ok, data } = await panelRequest(token, "POST", path, body);
      if (!ok || data?.success === false) {
        toast("error", data?.message || "ذخیره بنر ناموفق بود.");
        return;
      }
      toast("success", editingId ? "بنر ویرایش شد." : "بنر اضافه شد.");
      closeModal();
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("این بنر حذف شود؟")) return;
    setSaving(true);
    try {
      const { ok, data } = await panelRequest(
        token,
        "POST",
        "panel/home-sliders/delete",
        { id }
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "حذف بنر ناموفق بود.");
        return;
      }
      toast("success", "بنر حذف شد.");
      if (selectedId === id) setSelectedId(null);
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: HomeSliderItem) => {
    setSaving(true);
    try {
      const { ok, data } = await panelRequest(
        token,
        "POST",
        "panel/home-sliders/update",
        {
          id: item.id,
          image_url: item.image_url,
          action: item.action ?? "",
          is_active: Number(item.is_active) === 1 ? false : true,
          sort_order: item.sort_order ?? 0,
          image: null
        }
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "تغییر وضعیت ناموفق بود.");
        return;
      }
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setSaving(true);
    try {
      const { ok, data } = await panelRequest(
        token,
        "POST",
        "panel/home-sliders/reorder",
        { ids: next.map(item => item.id) }
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "تغییر ترتیب ناموفق بود.");
        return;
      }
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const selectedIndex = selected
    ? items.findIndex(item => item.id === selected.id)
    : -1;

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.title}>Home Slider</div>
        <div className={styles.headerActions}>
          <Button
            color="success"
            disabled={saving || loading}
            label={<span className={styles.buttonLabel}>افزودن بنر</span>}
            onClick={openCreate}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.panel}>
          {loading ? (
            <div className={styles.loadingState}>در حال بارگذاری...</div>
          ) : items.length === 0 ? (
            <EmptyPage className={styles.emptyPage} />
          ) : (
            <div className={styles.split}>
              <div className={styles.listPane}>
                <div className={styles.listHeader}>
                  <div className={styles.listHeaderTitle}>بنرها</div>
                  <button
                    type="button"
                    className={styles.refreshBtn}
                    onClick={() => loadItems()}
                    disabled={loading || saving}
                    aria-label="بازخوانی"
                  >
                    ↻
                  </button>
                </div>
                <div className={styles.list}>
                  {items.map(item => (
                    <StaffsItem
                      key={item.id}
                      avatar={item.image_url}
                      selected={selectedId === item.id ? "selected" : undefined}
                      onClick={() => setSelectedId(item.id)}
                      slot={
                        <div className={styles.itemMeta}>
                          ترتیب {item.sort_order ?? 0} ·{" "}
                          {Number(item.is_active) === 1 ? "فعال" : "غیرفعال"}
                        </div>
                      }
                    >
                      {item.action?.trim() || `بنر #${item.id}`}
                    </StaffsItem>
                  ))}
                </div>
              </div>

              <div className={styles.detailPane}>
                {selected ? (
                  <>
                    <div className={styles.detailHeader}>
                      <img
                        alt=""
                        className={styles.detailAvatar}
                        src={selected.image_url}
                      />
                      <div className={styles.detailHeaderText}>
                        <div className={styles.detailTitle}>
                          {selected.action?.trim() || `بنر #${selected.id}`}
                        </div>
                        <div className={styles.detailSubtitle}>
                          ترتیب نمایش: {selected.sort_order ?? selectedIndex}
                        </div>
                      </div>
                      <div className={styles.detailActions}>
                        <Button
                          color="second"
                          size="small"
                          loading={saving}
                          disabel={saving}
                          label="ویرایش"
                          onClick={() => openEdit(selected)}
                        />
                        <Button
                          color="muted"
                          size="small"
                          loading={saving}
                          disabel={saving}
                          label={
                            Number(selected.is_active) === 1
                              ? "غیرفعال"
                              : "فعال"
                          }
                          onClick={() => toggleActive(selected)}
                        />
                        <Button
                          color="errorDestructive"
                          size="small"
                          loading={saving}
                          disabel={saving}
                          label="حذف"
                          onClick={() => handleDelete(selected.id)}
                        />
                      </div>
                    </div>

                    <div className={styles.detailBody}>
                      <img
                        alt=""
                        className={styles.detailPreview}
                        src={selected.image_url}
                      />
                      <div className={styles.detailField}>
                        <span className={styles.fieldLabel}>Action</span>
                        <div className={styles.fieldValue}>
                          {selected.action?.trim() || "بدون Action"}
                        </div>
                      </div>
                      <div className={styles.detailField}>
                        <span className={styles.fieldLabel}>وضعیت</span>
                        <div className={styles.fieldValue}>
                          {Number(selected.is_active) === 1
                            ? "فعال"
                            : "غیرفعال"}
                        </div>
                      </div>
                      <div className={styles.reorderRow}>
                        <Button
                          color="dark"
                          size="small"
                          disabled={saving || selectedIndex <= 0}
                          label="بالا ↑"
                          onClick={() => moveItem(selectedIndex, -1)}
                        />
                        <Button
                          color="dark"
                          size="small"
                          disabled={
                            saving ||
                            selectedIndex < 0 ||
                            selectedIndex >= items.length - 1
                          }
                          label="پایین ↓"
                          onClick={() => moveItem(selectedIndex, 1)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.loadingState}>
                    یک بنر را از لیست انتخاب کنید.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        className={styles.requestModal}
        closeOnBackdropClick={true}
        content={
          <form className={styles.modalForm} onSubmit={handleSave}>
            <div className={styles.formGrid}>
              <div>
                <span className={styles.fieldLabel}>تصویر بنر</span>
                <div className={styles.uploaderCard}>
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className={styles.uploaderPreview}
                      src={previewUrl}
                    />
                  ) : null}
                  <input
                    ref={fileRef}
                    type="file"
                    accept={IMAGE_ACCEPT_ATTR}
                    disabled={saving || checkingImage}
                    onChange={event =>
                      handlePickImage(event.target.files?.[0] || null)
                    }
                  />
                  <div className={styles.uploaderHint}>
                    {checkingImage
                      ? "در حال بررسی تصویر…"
                      : `JPG، PNG یا WEBP · حداکثر ${MAX_IMAGE_UPLOAD_MB}MB · نسبت نزدیک به ۱۶:6 · حداقل ۶۴۰×۲۴۰ پیکسل`}
                  </div>
                </div>
              </div>
              <label>
                <span className={styles.fieldLabel}>
                  Action (مسیر داخلی یا URL)
                </span>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="/home/bookNurse یا https://..."
                  value={form.action}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      action: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>ترتیب نمایش</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      sort_order: Number(event.target.value) || 0
                    }))
                  }
                />
              </label>
              <label className={styles.switchRow}>
                <span className={styles.fieldLabel}>وضعیت نمایش</span>
                <input
                  checked={form.is_active}
                  type="checkbox"
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      is_active: event.target.checked
                    }))
                  }
                />
              </label>
            </div>
            <div className={styles.modalActions}>
              <Button
                color="success"
                loading={saving}
                disabel={saving}
                submitsForm={true}
                label={
                  saving
                    ? "در حال ذخیره..."
                    : editingId
                      ? "ذخیره ویرایش"
                      : "افزودن بنر"
                }
              />
              <Button
                color="muted"
                disabel={saving}
                label="انصراف"
                onClick={closeModal}
              />
            </div>
          </form>
        }
        heading={editingId ? "ویرایش بنر" : "افزودن بنر"}
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

export default MainPageHomeSlider;
