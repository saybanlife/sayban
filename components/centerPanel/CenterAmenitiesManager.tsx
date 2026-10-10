import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import styles from "./CenterPanelFeatures.module.css";
import Check from "../Check";
import Modal from "../Modal";
import type { AmenityLibraryItem } from "./panelApi";
import { usePanelApi } from "./usePanelApi";

type CenterAmenitiesManagerProps = {
  centerId?: string | number;
  token?: string;
};

export function CenterAmenitiesManager({
  centerId,
  token
}: CenterAmenitiesManagerProps) {
  const api = usePanelApi(token);
  const globalActions = useGlobalActions();
  const [library, setLibrary] = React.useState<AmenityLibraryItem[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [customName, setCustomName] = React.useState("");
  const [customDescription, setCustomDescription] = React.useState("");
  const [requesting, setRequesting] = React.useState(false);
  const [requestModalOpen, setRequestModalOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const [libraryItems, centerItems] = await Promise.all([
        api.fetchAmenitiesLibrary(),
        api.fetchCenterAmenities(centerId)
      ]);
      setLibrary(libraryItems);
      setSelectedIds(centerItems.map(item => Number(item.id)).filter(Boolean));
    } finally {
      setLoading(false);
    }
  }, [api, centerId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLibrary = library.filter(item => {
    const q = search.trim();
    if (!q) return true;
    return (
      item.name.includes(q) ||
      (item.slug || "").includes(q) ||
      (item.description || "").includes(q)
    );
  });

  const toggleAmenity = (id: number) => {
    setSelectedIds(current =>
      current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    );
  };

  const handleSave = async () => {
    if (!centerId) return;
    setSaving(true);
    try {
      const ok = await api.syncCenterAmenities(centerId, selectedIds);
      if (ok) {
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCustomRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!centerId || !customName.trim()) {
      globalActions?.["Fragment.showToast"]?.(
        "error",
        "نام امکان پیشنهادی را وارد کنید.",
        "top-center"
      );
      return;
    }
    setRequesting(true);
    try {
      const ok = await api.requestCustomAmenity({
        center_id: Number(centerId),
        name: customName.trim(),
        description: customDescription.trim()
      });
      if (ok) {
        setCustomName("");
        setCustomDescription("");
        setRequestModalOpen(false);
      }
    } finally {
      setRequesting(false);
    }
  };

  if (!centerId) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>امکانات مرکز</div>
          <p className={styles.sectionHint}>
            از فهرست پیش‌فرض انتخاب کنید. موارد انتخاب‌شده در صفحه عمومی مرکز
            نمایش داده می‌شوند.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => setRequestModalOpen(true)}
        >
          امکان جدید
        </button>
      </div>

      <div className={styles.card}>
        <label>
          <span className={styles.fieldLabel}>جستجو در امکانات</span>
          <input
            className={styles.input}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="نام امکان را جستجو کنید..."
            maxLength={80}
          />
        </label>

        {loading ? (
          <div className={styles.emptyState}>در حال بارگذاری...</div>
        ) : filteredLibrary.length ? (
          <div className={styles.amenitiesChecklist}>
            {filteredLibrary.map(item => {
              const id = Number(item.id);
              const isSelected = selectedIds.includes(id);
              return (
                <div key={id} className={styles.amenityCheckItem}>
                  <Check
                    className={styles.amenityCheckbox}
                    dir={"rtl"}
                    isSelected={isSelected}
                    label={item.name}
                    onChange={() => toggleAmenity(id)}
                    tims={true}
                    value={String(id)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>امکانی یافت نشد.</div>
        )}

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving || loading}
          >
            ذخیره امکانات ({selectedIds.length})
          </button>
        </div>
      </div>

      <Modal
        className={styles.requestModal}
        closeOnBackdropClick={true}
        content={
          <form className={styles.modalForm} onSubmit={handleCustomRequest}>
            <p className={styles.sectionHint}>
              اگر امکان مورد نظر در فهرست نیست، درخواست خود را برای بررسی تیم
              ارسال کنید.
            </p>
            <div className={styles.formGrid}>
              <label>
                <span className={styles.fieldLabel}>نام امکان</span>
                <input
                  className={styles.input}
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="مثلاً: سالن یوگا"
                  maxLength={80}
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>توضیحات (اختیاری)</span>
                <textarea
                  className={styles.textarea}
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  placeholder="توضیح کوتاه درباره این امکان..."
                  maxLength={500}
                />
              </label>
            </div>
            <div className={styles.actionsRow}>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={requesting}
                aria-busy={requesting || undefined}
              >
                {requesting ? "در حال ارسال..." : "ارسال درخواست"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setRequestModalOpen(false)}
                disabled={requesting}
              >
                لغو
              </button>
            </div>
          </form>
        }
        heading={"درخواست امکان جدید"}
        isOpen={requestModalOpen}
        noTrigger={true}
        onOpenChange={open => setRequestModalOpen(Boolean(open))}
        showFooter={false}
        showHeader={true}
        trigger={null}
      />
    </section>
  );
}

export default CenterAmenitiesManager;
