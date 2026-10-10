import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import styles from "./CenterPanelFeatures.module.css";
import Check from "../Check";
import {
  asPanelBool,
  type CareItemRow,
  type SpecialistRow
} from "./panelApi";
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

type ServiceKey = SpecialistType | typeof DOCTOR_TYPE;

const emptyDoctor: DoctorDraft = {
  selected: false,
  kind: "",
  frequency: "",
  visitInterval: "",
  rowId: null
};

const DEFAULT_SERVICE_ORDER: ServiceKey[] = [
  ...SPECIALIST_TYPES.map(option => option.value),
  DOCTOR_TYPE
];

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

/** Selected specialists first (by sort_order), then remaining catalog keys. */
function buildServiceOrder(rows: SpecialistRow[]): ServiceKey[] {
  const selected = rows
    .slice()
    .sort(
      (a, b) =>
        Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999) ||
        Number(a.id) - Number(b.id)
    )
    .map(row => String(row.specialist_type || "").trim() as ServiceKey)
    .filter(key => DEFAULT_SERVICE_ORDER.indexOf(key) !== -1);

  const ordered: ServiceKey[] = [];
  for (const key of selected) {
    if (ordered.indexOf(key) === -1) ordered.push(key);
  }
  for (const key of DEFAULT_SERVICE_ORDER) {
    if (ordered.indexOf(key) === -1) ordered.push(key);
  }
  return ordered;
}

function moveIndex<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function DragHandle() {
  return (
    <span className={styles.dragHandle} aria-hidden title="جابه‌جایی">
      ⋮⋮
    </span>
  );
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
  const [serviceOrder, setServiceOrder] = React.useState<ServiceKey[]>(
    DEFAULT_SERVICE_ORDER
  );
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dragFacilityIndex, setDragFacilityIndex] = React.useState<number | null>(
    null
  );
  const [overFacilityIndex, setOverFacilityIndex] = React.useState<number | null>(
    null
  );
  const [dragServiceIndex, setDragServiceIndex] = React.useState<number | null>(
    null
  );
  const [overServiceIndex, setOverServiceIndex] = React.useState<number | null>(
    null
  );

  const loadData = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const [centerItems, specialistRows] = await Promise.all([
        api.fetchCenterCareItems(centerId),
        api.fetchSpecialists(centerId)
      ]);
      const sortedItems = centerItems
        .slice()
        .sort(
          (a, b) =>
            Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999) ||
            Number(a.id) - Number(b.id)
        );
      setItems(sortedItems);
      setSelectedIds(
        sortedItems
          .filter(item => asPanelBool(item.has_it))
          .map(item => Number(item.id))
          .filter(Boolean)
      );
      const noteMap: Record<number, string> = {};
      sortedItems.forEach(item => {
        if (item.note) noteMap[Number(item.id)] = String(item.note);
      });
      setNotes(noteMap);
      setServices(buildServiceDrafts(specialistRows));
      setDoctor(buildDoctorDraft(specialistRows));
      setServiceOrder(buildServiceOrder(specialistRows));
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

  const facilitiesPayload = React.useCallback(
    (list: CareItemRow[]) =>
      list.map((item, index) => {
        const id = Number(item.id);
        const selected = selectedIds.includes(id);
        return {
          id,
          has_it: selected,
          note: selected ? notes[id] || null : null,
          sort_order: index
        };
      }),
    [notes, selectedIds]
  );

  const handleSaveFacilities = async () => {
    if (!centerId) return;
    setSaving(true);
    try {
      const ok = await api.syncCenterCareItems(
        centerId,
        facilitiesPayload(items),
        { quiet: true }
      );
      toast(
        ok ? "success" : "error",
        ok ? "مراقبت و پشتیبانی ذخیره شد." : "ذخیره مراقبت ناموفق بود."
      );
      if (ok) await loadData();
    } finally {
      setSaving(false);
    }
  };

  const persistFacilityOrder = async (nextItems: CareItemRow[]) => {
    if (!centerId) return;
    setItems(nextItems);
    const ok = await api.syncCenterCareItems(
      centerId,
      facilitiesPayload(nextItems),
      { quiet: true }
    );
    if (!ok) {
      toast("error", "ذخیره ترتیب مراقبت ناموفق بود.");
      await loadData();
      return;
    }
    toast("success", "ترتیب مراقبت ذخیره شد.");
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
        sort_order?: number;
        quiet?: boolean;
      }
    ) => {
      if (!centerId) return true;
      const quiet = Boolean(draft.quiet);
      if (!draft.selected) {
        if (draft.rowId == null) return true;
        return api.deleteSpecialist(draft.rowId, { quiet });
      }
      const payload = {
        center_id: centerId,
        specialist_type: type,
        frequency: draft.frequency || null,
        doctor_kind: draft.doctor_kind || null,
        visit_interval: draft.visit_interval || null,
        sort_order: draft.sort_order ?? 0
      };
      return draft.rowId == null
        ? api.createSpecialist(payload, { quiet })
        : api.updateSpecialist({ ...payload, id: draft.rowId }, { quiet });
    },
    [api, centerId]
  );

  const handleSaveServices = async () => {
    if (!centerId) return;
    setSaving(true);
    try {
      const results: boolean[] = [];
      for (let index = 0; index < serviceOrder.length; index += 1) {
        const key = serviceOrder[index];
        if (key === DOCTOR_TYPE) {
        results.push(
          Boolean(
            await syncSpecialist(DOCTOR_TYPE, {
              selected: doctor.selected,
              rowId: doctor.rowId,
              frequency: doctor.frequency,
              doctor_kind: doctor.kind,
              visit_interval: doctor.visitInterval.trim(),
              sort_order: index,
              quiet: true
            })
          )
        );
          continue;
        }
        const draft = services[key];
        results.push(
          Boolean(
            await syncSpecialist(key, {
              selected: draft.selected,
              rowId: draft.rowId,
              frequency: draft.frequency,
              sort_order: index,
              quiet: true
            })
          )
        );
      }
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

  const persistServiceOrder = async (nextOrder: ServiceKey[]) => {
    if (!centerId) return;
    setServiceOrder(nextOrder);
    const results: boolean[] = [];
    for (let index = 0; index < nextOrder.length; index += 1) {
      const key = nextOrder[index];
      if (key === DOCTOR_TYPE) {
        if (!doctor.selected || doctor.rowId == null) continue;
        results.push(
          Boolean(
            await syncSpecialist(DOCTOR_TYPE, {
              selected: true,
              rowId: doctor.rowId,
              frequency: doctor.frequency,
              doctor_kind: doctor.kind,
              visit_interval: doctor.visitInterval.trim(),
              sort_order: index,
              quiet: true
            })
          )
        );
        continue;
      }
      const draft = services[key];
      if (!draft?.selected || draft.rowId == null) continue;
      results.push(
        Boolean(
          await syncSpecialist(key, {
            selected: true,
            rowId: draft.rowId,
            frequency: draft.frequency,
            sort_order: index,
            quiet: true
          })
        )
      );
    }
    if (!results.length) {
      toast(
        "success",
        "ترتیب در پنل به‌روز شد. پس از ذخیره خدمات، در صفحه مرکز اعمال می‌شود."
      );
      return;
    }
    if (results.every(Boolean)) {
      toast("success", "ترتیب خدمات ذخیره شد.");
    } else {
      toast("error", "ذخیره ترتیب خدمات ناموفق بود.");
      await loadData();
    }
  };

  if (!centerId) return null;

  const selectedServiceCount =
    SPECIALIST_TYPES.filter(option => services[option.value]?.selected).length +
    (doctor.selected ? 1 : 0);

  const specialistLabel = (key: ServiceKey) =>
    key === DOCTOR_TYPE
      ? "ویزیت پزشک"
      : SPECIALIST_TYPES.find(option => option.value === key)?.label || key;

  return (
    <section
      className={`${styles.section}${compact ? ` ${styles.sectionCompact}` : ""}`}
    >
      {!compact ? (
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>مراقبت و درمان</div>
            <p className={styles.sectionHint}>
              امکانات مراقبتی، خدمات تخصصی و ویزیت پزشک را مشخص کنید. برای تغییر
              ترتیب نمایش، ردیف‌ها را بکشید و رها کنید.
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
            {items.map((item, index) => {
              const id = Number(item.id);
              const selected = selectedIds.includes(id);
              return (
                <div
                  className={`${styles.listItem} ${styles.listItemDraggable}${
                    dragFacilityIndex === index ? ` ${styles.listItemDragging}` : ""
                  }${
                    overFacilityIndex === index ? ` ${styles.listItemDragOver}` : ""
                  }`}
                  key={id}
                  draggable
                  onDragStart={event => {
                    setDragFacilityIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => {
                    setDragFacilityIndex(null);
                    setOverFacilityIndex(null);
                  }}
                  onDragOver={event => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (overFacilityIndex !== index) setOverFacilityIndex(index);
                  }}
                  onDragLeave={() => {
                    if (overFacilityIndex === index) setOverFacilityIndex(null);
                  }}
                  onDrop={event => {
                    event.preventDefault();
                    const from = Number(
                      event.dataTransfer.getData("text/plain") ||
                        dragFacilityIndex
                    );
                    setOverFacilityIndex(null);
                    setDragFacilityIndex(null);
                    if (!Number.isFinite(from) || from === index) return;
                    void persistFacilityOrder(moveIndex(items, from, index));
                  }}
                >
                  <div className={styles.listItemRow}>
                    <DragHandle />
                    <div className={styles.listItemBodyGrow}>
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
                          <span className={styles.fieldLabel}>
                            توضیح (اختیاری)
                          </span>
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
                  </div>
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
            {serviceOrder.map((key, index) => {
              if (key === DOCTOR_TYPE) {
                return (
                  <div
                    className={`${styles.listItem} ${styles.listItemDraggable}${
                      dragServiceIndex === index
                        ? ` ${styles.listItemDragging}`
                        : ""
                    }${
                      overServiceIndex === index
                        ? ` ${styles.listItemDragOver}`
                        : ""
                    }`}
                    key={DOCTOR_TYPE}
                    draggable
                    onDragStart={event => {
                      setDragServiceIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                    }}
                    onDragEnd={() => {
                      setDragServiceIndex(null);
                      setOverServiceIndex(null);
                    }}
                    onDragOver={event => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (overServiceIndex !== index) setOverServiceIndex(index);
                    }}
                    onDragLeave={() => {
                      if (overServiceIndex === index) setOverServiceIndex(null);
                    }}
                    onDrop={event => {
                      event.preventDefault();
                      const from = Number(
                        event.dataTransfer.getData("text/plain") ||
                          dragServiceIndex
                      );
                      setOverServiceIndex(null);
                      setDragServiceIndex(null);
                      if (!Number.isFinite(from) || from === index) return;
                      void persistServiceOrder(
                        moveIndex(serviceOrder, from, index)
                      );
                    }}
                  >
                    <div className={styles.listItemRow}>
                      <DragHandle />
                      <div className={styles.listItemBodyGrow}>
                        <Check
                          className={styles.amenityCheckbox}
                          dir="rtl"
                          isSelected={doctor.selected}
                          label={specialistLabel(DOCTOR_TYPE)}
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
                                    frequency: e.target
                                      .value as CareFrequency | ""
                                  }))
                                }
                              >
                                <option value="">انتخاب کنید</option>
                                {CARE_FREQUENCIES.map(frequency => (
                                  <option
                                    key={frequency.value}
                                    value={frequency.value}
                                  >
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
                  </div>
                );
              }

              const draft = services[key];
              return (
                <div
                  className={`${styles.listItem} ${styles.listItemDraggable}${
                    dragServiceIndex === index ? ` ${styles.listItemDragging}` : ""
                  }${
                    overServiceIndex === index ? ` ${styles.listItemDragOver}` : ""
                  }`}
                  key={key}
                  draggable
                  onDragStart={event => {
                    setDragServiceIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => {
                    setDragServiceIndex(null);
                    setOverServiceIndex(null);
                  }}
                  onDragOver={event => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (overServiceIndex !== index) setOverServiceIndex(index);
                  }}
                  onDragLeave={() => {
                    if (overServiceIndex === index) setOverServiceIndex(null);
                  }}
                  onDrop={event => {
                    event.preventDefault();
                    const from = Number(
                      event.dataTransfer.getData("text/plain") ||
                        dragServiceIndex
                    );
                    setOverServiceIndex(null);
                    setDragServiceIndex(null);
                    if (!Number.isFinite(from) || from === index) return;
                    void persistServiceOrder(moveIndex(serviceOrder, from, index));
                  }}
                >
                  <div className={styles.listItemRow}>
                    <DragHandle />
                    <div className={styles.listItemBodyGrow}>
                      <Check
                        className={styles.amenityCheckbox}
                        dir="rtl"
                        isSelected={draft.selected}
                        label={specialistLabel(key)}
                        onChange={() =>
                          patchService(key, { selected: !draft.selected })
                        }
                        tims={true}
                        value={key}
                      />
                      {draft.selected ? (
                        <label>
                          <span className={styles.fieldLabel}>تناوب</span>
                          <select
                            className={styles.input}
                            value={draft.frequency}
                            onChange={e =>
                              patchService(key, {
                                frequency: e.target.value as CareFrequency | ""
                              })
                            }
                          >
                            <option value="">انتخاب کنید</option>
                            {CARE_FREQUENCIES.map(frequency => (
                              <option
                                key={frequency.value}
                                value={frequency.value}
                              >
                                {frequency.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
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
