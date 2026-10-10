import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import styles from "./CenterPanelFeatures.module.css";
import Check from "../Check";
import { asPanelBool, type CareItemRow, type SpecialistRow } from "./panelApi";
import { usePanelApi } from "./usePanelApi";
import {
  CARE_FREQUENCIES,
  DOCTOR_KINDS,
  DOCTOR_TYPE,
  SPECIALIST_TYPES,
  type CareFrequency,
  type DoctorKind,
  type SpecialistType
} from "../centerPage/careTreatmentVocab";

type CenterCareItemsManagerProps = {
  centerId?: string | number;
  token?: string;
  compact?: boolean;
};

/** Editor state for one of the nine selectable services. */
type ServiceDraft = {
  selected: boolean;
  frequency: CareFrequency | "";
  /** Existing row id, so saving can update instead of recreating. */
  rowId: number | null;
};

type DoctorDraft = {
  selected: boolean;
  kind: DoctorKind | "";
  frequency: CareFrequency | "";
  visitInterval: string;
  rowId: number | null;
};

const emptyDoctor: DoctorDraft = {
  selected: false,
  kind: "",
  frequency: "",
  visitInterval: "",
  rowId: null
};

function buildServiceDrafts(rows: SpecialistRow[]) {
  const byType = new Map(
    rows.map(row => [String(row.specialist_type || "").trim(), row])
  );
  const drafts = {} as Record<SpecialistType, ServiceDraft>;
  for (const option of SPECIALIST_TYPES) {
    const row = byType.get(option.value);
    drafts[option.value] = {
      selected: Boolean(row),
      frequency: (row?.frequency as CareFrequency) || "",
      rowId: row ? Number(row.id) : null
    };
  }
  return drafts;
}

function buildDoctorDraft(rows: SpecialistRow[]): DoctorDraft {
  const row = rows.find(
    item => String(item.specialist_type || "").trim() === DOCTOR_TYPE
  );
  if (!row) return emptyDoctor;
  return {
    selected: true,
    kind: (row.doctor_kind as DoctorKind) || "",
    frequency: (row.frequency as CareFrequency) || "",
    visitInterval: row.visit_interval ? String(row.visit_interval) : "",
    rowId: Number(row.id)
  };
}

export function CenterCareItemsManager({
  centerId,
  token,
  compact = false
}: CenterCareItemsManagerProps) {
  const api = usePanelApi(token);
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const [items, setItems] = React.useState<CareItemRow[]>([]);
  const [notes, setNotes] = React.useState<Record<number, string>>({});
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [services, setServices] = React.useState<
    Record<SpecialistType, ServiceDraft>
  >(() => buildServiceDrafts([]));
  const [doctor, setDoctor] = React.useState<DoctorDraft>(emptyDoctor);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const [centerItems, specialistRows] = await Promise.all([
        api.fetchCenterCareItems(centerId),
        api.fetchSpecialists(centerId)
      ]);
      setItems(centerItems);
      setSelectedIds(
        centerItems
          .filter(item => asPanelBool(item.has_it))
          .map(item => Number(item.id))
          .filter(Boolean)
      );
      const noteMap: Record<number, string> = {};
      centerItems.forEach(item => {
        if (item.note) noteMap[Number(item.id)] = String(item.note);
      });
      setNotes(noteMap);
      setServices(buildServiceDrafts(specialistRows));
      setDoctor(buildDoctorDraft(specialistRows));
    } finally {
      setLoading(false);
    }
  }, [api, centerId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleItem = (id: number) => {
    setSelectedIds(current =>
      current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    );
  };

  const patchService = (type: SpecialistType, patch: Partial<ServiceDraft>) => {
    setServices(current => ({
      ...current,
      [type]: { ...current[type], ...patch }
    }));
  };

  const handleSaveFacilities = async () => {
    if (!centerId) return;
    setSaving(true);
    try {
      const payload = items.map(item => {
        const id = Number(item.id);
        const selected = selectedIds.includes(id);
        return {
          id,
          has_it: selected,
          note: selected ? notes[id] || null : null
        };
      });
      const ok = await api.syncCenterCareItems(centerId, payload);
      toast(
        ok ? "success" : "error",
        ok ? "مراقبت و پشتیبانی ذخیره شد." : "ذخیره مراقبت ناموفق بود."
      );
      if (ok) await loadData();
    } finally {
      setSaving(false);
    }
  };

  /** Creates, updates or removes one specialist row to match its draft. */
  const syncSpecialist = React.useCallback(
    async (
      type: string,
      draft: {
        selected: boolean;
        rowId: number | null;
        frequency?: string;
        doctor_kind?: string;
        visit_interval?: string;
      }
    ) => {
      if (!centerId) return true;
      if (!draft.selected) {
        if (draft.rowId == null) return true;
        return api.deleteSpecialist(draft.rowId);
      }
      const payload = {
        center_id: centerId,
        specialist_type: type,
        frequency: draft.frequency || null,
        doctor_kind: draft.doctor_kind || null,
        visit_interval: draft.visit_interval || null
      };
      return draft.rowId == null
        ? api.createSpecialist(payload)
        : api.updateSpecialist({ ...payload, id: draft.rowId });
    },
    [api, centerId]
  );

  const handleSaveServices = async () => {
    if (!centerId) return;
    setSaving(true);
    try {
      const results: boolean[] = [];
      for (const option of SPECIALIST_TYPES) {
        const draft = services[option.value];
        results.push(
          Boolean(
            await syncSpecialist(option.value, {
              selected: draft.selected,
              rowId: draft.rowId,
              frequency: draft.frequency
            })
          )
        );
      }
      results.push(
        Boolean(
          await syncSpecialist(DOCTOR_TYPE, {
            selected: doctor.selected,
            rowId: doctor.rowId,
            frequency: doctor.frequency,
            doctor_kind: doctor.kind,
            visit_interval: doctor.visitInterval.trim()
          })
        )
      );
      const ok = results.every(Boolean);
      toast(
        ok ? "success" : "error",
        ok ? "خدمات درمانی ذخیره شد." : "ذخیره بخشی از خدمات ناموفق بود."
      );
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (!centerId) return null;

  const selectedServiceCount =
    SPECIALIST_TYPES.filter(option => services[option.value]?.selected).length +
    (doctor.selected ? 1 : 0);

  return (
    <section
      className={`${styles.section}${compact ? ` ${styles.sectionCompact}` : ""}`}
    >
      {!compact ? (
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>مراقبت و درمان</div>
            <p className={styles.sectionHint}>
              امکانات مراقبتی، خدمات تخصصی و ویزیت پزشک را مشخص کنید.
            </p>
          </div>
        </div>
      ) : null}

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>مراقبت و پشتیبانی</div>
            <p className={styles.sectionHint}>
              امکاناتی که مرکز به‌صورت دائم ارائه می‌دهد.
            </p>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>در حال بارگذاری...</div>
        ) : items.length ? (
          <div className={styles.list}>
            {items.map(item => {
              const id = Number(item.id);
              const selected = selectedIds.includes(id);
              return (
                <div className={styles.listItem} key={id}>
                  <Check
                    className={styles.amenityCheckbox}
                    dir="rtl"
                    isSelected={selected}
                    label={item.name}
                    onChange={() => toggleItem(id)}
                    tims={true}
                    value={String(id)}
                  />
                  {selected ? (
                    <label>
                      <span className={styles.fieldLabel}>توضیح (اختیاری)</span>
                      <input
                        className={styles.input}
                        value={notes[id] || ""}
                        onChange={e =>
                          setNotes(current => ({
                            ...current,
                            [id]: e.target.value
                          }))
                        }
                        placeholder="مثلاً: در تمام ساعات شبانه‌روز"
                        maxLength={120}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>موردی تعریف نشده است.</div>
        )}

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSaveFacilities}
            disabled={saving || loading}
            aria-busy={saving || undefined}
          >
            {saving
              ? "در حال ذخیره..."
              : `ذخیره مراقبت (${selectedIds.length})`}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>خدمات تخصصی</div>
            <p className={styles.sectionHint}>
              خدمات ارائه‌شده و تناوب حضور هر کدام را انتخاب کنید.
            </p>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>در حال بارگذاری...</div>
        ) : (
          <div className={styles.list}>
            {SPECIALIST_TYPES.map(option => {
              const draft = services[option.value];
              return (
                <div className={styles.listItem} key={option.value}>
                  <Check
                    className={styles.amenityCheckbox}
                    dir="rtl"
                    isSelected={draft.selected}
                    label={option.label}
                    onChange={() =>
                      patchService(option.value, { selected: !draft.selected })
                    }
                    tims={true}
                    value={option.value}
                  />
                  {draft.selected ? (
                    <label>
                      <span className={styles.fieldLabel}>تناوب</span>
                      <select
                        className={styles.input}
                        value={draft.frequency}
                        onChange={e =>
                          patchService(option.value, {
                            frequency: e.target.value as CareFrequency | ""
                          })
                        }
                      >
                        <option value="">انتخاب کنید</option>
                        {CARE_FREQUENCIES.map(frequency => (
                          <option key={frequency.value} value={frequency.value}>
                            {frequency.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              );
            })}

            <div className={styles.listItem}>
              <Check
                className={styles.amenityCheckbox}
                dir="rtl"
                isSelected={doctor.selected}
                label="ویزیت پزشک"
                onChange={() =>
                  setDoctor(current => ({
                    ...current,
                    selected: !current.selected
                  }))
                }
                tims={true}
                value={DOCTOR_TYPE}
              />
              {doctor.selected ? (
                <div className={styles.formGrid}>
                  <label>
                    <span className={styles.fieldLabel}>نوع پزشک</span>
                    <select
                      className={styles.input}
                      value={doctor.kind}
                      onChange={e =>
                        setDoctor(current => ({
                          ...current,
                          kind: e.target.value as DoctorKind | ""
                        }))
                      }
                    >
                      <option value="">انتخاب کنید</option>
                      {DOCTOR_KINDS.map(kind => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={styles.fieldLabel}>تناوب</span>
                    <select
                      className={styles.input}
                      value={doctor.frequency}
                      onChange={e =>
                        setDoctor(current => ({
                          ...current,
                          frequency: e.target.value as CareFrequency | ""
                        }))
                      }
                    >
                      <option value="">انتخاب کنید</option>
                      {CARE_FREQUENCIES.map(frequency => (
                        <option key={frequency.value} value={frequency.value}>
                          {frequency.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={styles.fieldLabel}>
                      تعداد دفعات یا فاصله ویزیت
                    </span>
                    <input
                      className={styles.input}
                      value={doctor.visitInterval}
                      onChange={e =>
                        setDoctor(current => ({
                          ...current,
                          visitInterval: e.target.value
                        }))
                      }
                      placeholder="مثلاً هفته‌ای دو بار"
                      maxLength={80}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSaveServices}
            disabled={saving || loading}
            aria-busy={saving || undefined}
          >
            {saving
              ? "در حال ذخیره..."
              : `ذخیره خدمات (${selectedServiceCount})`}
          </button>
        </div>
      </div>
    </section>
  );
}

export default CenterCareItemsManager;
