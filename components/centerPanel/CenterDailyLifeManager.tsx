import * as React from "react";
import styles from "./CenterPanelFeatures.module.css";
import { asPanelBool, type DailyScheduleRow } from "./panelApi";
import { usePanelApi } from "./usePanelApi";
import TimeField from "../datetime/PanelTimePicker";
import { parseTime } from "@/lib/datetime";
import {
  activitySlugCandidates,
  DAILY_ACTIVITY_CHECKLIST
} from "./profileSectionCatalogs";

type CenterDailyLifeManagerProps = {
  centerId?: string | number;
  token?: string;
  compact?: boolean;
};

const EMPTY_SCHEDULE: DailyScheduleRow = {
  wake_time: "",
  sleep_time: "",
  daily_routine_desc: "",
  weekly_schedule_sample: "",
  allows_family_participation: false,
  has_special_needs_program: false
};

type ScheduleFlagKey =
  | "wake_sleep"
  | "daily_routine"
  | "weekly_sample"
  | "family_participation"
  | "special_needs";

function scheduleFlagsFromRow(row: DailyScheduleRow): Record<ScheduleFlagKey, boolean> {
  return {
    wake_sleep: Boolean(row.wake_time || row.sleep_time),
    daily_routine: Boolean(String(row.daily_routine_desc || "").trim()),
    weekly_sample: Boolean(String(row.weekly_schedule_sample || "").trim()),
    family_participation: asPanelBool(row.allows_family_participation),
    special_needs: asPanelBool(row.has_special_needs_program)
  };
}

export function CenterDailyLifeManager({
  centerId,
  token,
  compact = false
}: CenterDailyLifeManagerProps) {
  const api = usePanelApi(token);
  const [schedule, setSchedule] =
    React.useState<DailyScheduleRow>(EMPTY_SCHEDULE);
  const [flags, setFlags] = React.useState<Record<ScheduleFlagKey, boolean>>(
    scheduleFlagsFromRow(EMPTY_SCHEDULE)
  );
  const [library, setLibrary] = React.useState<
    { id: number; name: string; slug?: string }[]
  >([]);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [notes, setNotes] = React.useState<Record<number, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const loadData = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const [scheduleRow, libraryItems, centerActivities] = await Promise.all([
        api.fetchDailySchedule(centerId),
        api.fetchActivitiesLibrary(),
        api.fetchCenterActivities(centerId)
      ]);
      const nextSchedule: DailyScheduleRow = {
        ...EMPTY_SCHEDULE,
        ...(scheduleRow || {}),
        allows_family_participation: asPanelBool(
          scheduleRow?.allows_family_participation
        ),
        has_special_needs_program: asPanelBool(
          scheduleRow?.has_special_needs_program
        ),
        wake_time: scheduleRow?.wake_time || "",
        sleep_time: scheduleRow?.sleep_time || "",
        daily_routine_desc: scheduleRow?.daily_routine_desc || "",
        weekly_schedule_sample: scheduleRow?.weekly_schedule_sample || ""
      };
      setSchedule(nextSchedule);
      setFlags(scheduleFlagsFromRow(nextSchedule));
      setLibrary(libraryItems);
      setSelectedIds(
        centerActivities.map(item => Number(item.id)).filter(Boolean)
      );
      const noteMap: Record<number, string> = {};
      centerActivities.forEach(item => {
        const id = Number(item.id);
        if (id && item.note) noteMap[id] = String(item.note);
      });
      setNotes(noteMap);
    } finally {
      setLoading(false);
    }
  }, [api, centerId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const libraryBySlug = React.useMemo(() => {
    const map = new Map<string, { id: number; name: string; slug?: string }>();
    for (const item of library) {
      if (item.slug) map.set(item.slug, item);
    }
    return map;
  }, [library]);

  const checklistItems = React.useMemo(() => {
    const fromCatalog = DAILY_ACTIVITY_CHECKLIST.map(preset => {
      let lib: { id: number; name: string; slug?: string } | undefined;
      for (const slug of activitySlugCandidates(preset.key)) {
        lib = libraryBySlug.get(slug);
        if (lib) break;
      }
      return {
        key: preset.key,
        label: preset.label,
        kind: preset.kind,
        id: lib?.id,
        name: lib?.name || preset.label
      };
    });
    const known = new Set(
      DAILY_ACTIVITY_CHECKLIST.flatMap(p => activitySlugCandidates(p.key))
    );
    const extras = library
      .filter(item => item.slug && !known.has(item.slug))
      .map(item => ({
        key: item.slug || String(item.id),
        label: item.name,
        kind: "activity" as const,
        id: item.id,
        name: item.name
      }));
    return [...fromCatalog, ...extras];
  }, [library, libraryBySlug]);

  const filtered = checklistItems.filter(item => {
    const q = search.trim();
    if (!q) return true;
    return item.label.includes(q) || item.key.includes(q);
  });

  const isSelected = (item: (typeof checklistItems)[number]) => {
    if (item.kind === "activity") {
      return Boolean(item.id && selectedIds.includes(item.id));
    }
    return Boolean(flags[item.key as ScheduleFlagKey]);
  };

  const toggleItem = (item: (typeof checklistItems)[number]) => {
    if (item.kind === "activity") {
      if (!item.id) return;
      setSelectedIds(current =>
        current.includes(item.id!)
          ? current.filter(x => x !== item.id)
          : [...current, item.id!]
      );
      return;
    }
    const key = item.key as ScheduleFlagKey;
    setFlags(current => {
      const next = { ...current, [key]: !current[key] };
      if (!next[key]) {
        setSchedule(s => {
          if (key === "wake_sleep") return { ...s, wake_time: "", sleep_time: "" };
          if (key === "daily_routine") return { ...s, daily_routine_desc: "" };
          if (key === "weekly_sample")
            return { ...s, weekly_schedule_sample: "" };
          if (key === "family_participation")
            return { ...s, allows_family_participation: false };
          if (key === "special_needs")
            return { ...s, has_special_needs_program: false };
          return s;
        });
      } else if (key === "family_participation") {
        setSchedule(s => ({ ...s, allows_family_participation: true }));
      } else if (key === "special_needs") {
        setSchedule(s => ({ ...s, has_special_needs_program: true }));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!centerId) return;
    setSaving(true);
    try {
      const payloadSchedule: DailyScheduleRow = {
        ...schedule,
        // Normalize on the way out so a legacy row loaded as "۰۷:۰۰" or "7:0"
        // is written back as canonical "07:00" instead of being re-saved as-is.
        wake_time: flags.wake_sleep ? parseTime(schedule.wake_time) || null : null,
        sleep_time: flags.wake_sleep
          ? parseTime(schedule.sleep_time) || null
          : null,
        daily_routine_desc: flags.daily_routine
          ? schedule.daily_routine_desc || null
          : null,
        weekly_schedule_sample: flags.weekly_sample
          ? schedule.weekly_schedule_sample || null
          : null,
        allows_family_participation: Boolean(flags.family_participation),
        has_special_needs_program: Boolean(flags.special_needs)
      };
      const okSchedule = await api.updateDailySchedule({
        center_id: centerId,
        wake_time: payloadSchedule.wake_time,
        sleep_time: payloadSchedule.sleep_time,
        daily_routine_desc: payloadSchedule.daily_routine_desc,
        weekly_schedule_sample: payloadSchedule.weekly_schedule_sample,
        allows_family_participation: Boolean(
          payloadSchedule.allows_family_participation
        ),
        has_special_needs_program: Boolean(
          payloadSchedule.has_special_needs_program
        )
      });
      const okActivities = await api.syncCenterActivities(
        centerId,
        selectedIds.map(id => ({
          id,
          note: (notes[id] || "").trim() || null
        }))
      );
      if (okSchedule || okActivities) await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (!centerId) return null;

  return (
    <section
      className={`${styles.section}${compact ? ` ${styles.sectionCompact}` : ""}`}
    >
      {!compact ? (
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>برنامه روزانه و فعالیت‌ها</div>
            <p className={styles.sectionHint}>
              مانند امکانات، موارد فعال را تیک بزنید و در صورت نیاز جزئیات را
              تکمیل کنید.
            </p>
          </div>
        </div>
      ) : null}

      <div className={styles.card}>
        <label>
          <span className={styles.fieldLabel}>جستجو</span>
          <input
            className={styles.input}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="مثلاً پیاده‌روی"
            maxLength={80}
          />
        </label>

        {loading ? (
          <div className={styles.emptyState}>در حال بارگذاری...</div>
        ) : (
          <div className={styles.amenitiesChecklist}>
            {!library.length ? (
              <div className={styles.emptyState}>
                کاتالوگ فعالیت‌های دیتابیس خالی است. گزینه‌های زمان‌بندی قابل
                ذخیره هستند؛ برای تیک‌زدن «ورزش، موسیقی، …» باید seed فعالیت‌ها
                روی دیتابیس اجرا شود.
              </div>
            ) : null}
            {filtered.map(item => {
              const selected = isSelected(item);
              const disabled =
                item.kind === "activity" && !item.id;
              return (
                <div key={item.key} className={styles.amenityCheckItem}>
                  <label className={styles.nativeCheckRow}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => {
                        if (!disabled) toggleItem(item);
                      }}
                    />
                    <span>{item.label}</span>
                  </label>
                  {selected && item.kind === "activity" && item.id ? (
                    <input
                      className={`${styles.input} ${styles.amenityNoteInput}`}
                      value={notes[item.id] || ""}
                      onChange={e =>
                        setNotes(current => ({
                          ...current,
                          [item.id!]: e.target.value
                        }))
                      }
                      placeholder="توضیح کوتاه (اختیاری)"
                      maxLength={120}
                    />
                  ) : null}
                  {selected && item.key === "wake_sleep" ? (
                    <div className={styles.formGrid} style={{ marginTop: 8 }}>
                      <TimeField
                        id="daily-wake-time"
                        label="ساعت بیدار شدن"
                        value={String(schedule.wake_time || "")}
                        onChange={next =>
                          setSchedule(s => ({ ...s, wake_time: next }))
                        }
                      />
                      <TimeField
                        id="daily-sleep-time"
                        label="ساعت خواب"
                        value={String(schedule.sleep_time || "")}
                        onChange={next =>
                          setSchedule(s => ({ ...s, sleep_time: next }))
                        }
                      />
                    </div>
                  ) : null}
                  {selected && item.key === "daily_routine" ? (
                    <label style={{ display: "block", marginTop: 8 }}>
                      <span className={styles.fieldLabel}>شرح برنامه روزانه</span>
                      <textarea
                        className={styles.textarea}
                        value={String(schedule.daily_routine_desc || "")}
                        onChange={e =>
                          setSchedule(s => ({
                            ...s,
                            daily_routine_desc: e.target.value
                          }))
                        }
                        placeholder="مثلاً ۷ صبح بیداری، صبحانه، تمرین و استراحت..."
                        maxLength={2000}
                      />
                    </label>
                  ) : null}
                  {selected && item.key === "weekly_sample" ? (
                    <label style={{ display: "block", marginTop: 8 }}>
                      <span className={styles.fieldLabel}>نمونه برنامه هفتگی</span>
                      <textarea
                        className={styles.textarea}
                        value={String(schedule.weekly_schedule_sample || "")}
                        onChange={e =>
                          setSchedule(s => ({
                            ...s,
                            weekly_schedule_sample: e.target.value
                          }))
                        }
                        placeholder="مثلاً شنبه: پیاده‌روی گروهی ساعت ۱۰"
                        maxLength={2000}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "در حال ذخیره…" : "ذخیره برنامه و فعالیت‌ها"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default CenterDailyLifeManager;
