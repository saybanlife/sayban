export type ProfileSectionKey =
  | "care_treatment"
  | "daily_life"
  | "family_visit";

export type ProfileSectionPreset = {
  key: string;
  label: string;
  defaultValue?: string;
  /** When true, value field is emphasized in the form. */
  valueHint?: string;
};

export type ProfileSectionItem = {
  /** Stable client/server key (preset id or custom slug). */
  key: string;
  label: string;
  value?: string;
  sort_order?: number;
};

export const CARE_TREATMENT_PRESETS: ProfileSectionPreset[] = [
  {
    key: "caregiver_aide_24h",
    label: "حضور مراقب یا کمک‌بهیار",
    defaultValue: "به‌صورت شبانه‌روزی"
  },
  { key: "private_caregiver", label: "امکان مراقب اختصاصی" },
  { key: "nutritionist", label: "متخصص تغذیه" },
  { key: "hospital_collab", label: "همکاری با بیمارستان" },
  { key: "psychologist", label: "روانشناس" },
  { key: "psychiatrist", label: "روانپزشک" },
  { key: "geriatrician", label: "پزشک طب سالمندی" },
  { key: "physiotherapist", label: "فیزیوتراپیست" },
  { key: "occupational_therapist", label: "کاردرمانگر" },
  { key: "social_worker", label: "مددکار اجتماعی" },
  { key: "dentist", label: "دندانپزشک" },
  { key: "speech_therapist", label: "گفتاردرمانگر" },
  { key: "medication_management", label: "مدیریت دارو" },
  {
    key: "doctor",
    label: "پزشک",
    defaultValue: "عمومی / متخصص",
    valueHint: "نوع پزشک (عمومی یا متخصص)"
  }
];

export const DAILY_LIFE_PRESETS: ProfileSectionPreset[] = [
  { key: "daily_schedule", label: "برنامه روزانه منظم" },
  { key: "light_exercise", label: "ورزش" },
  { key: "walking", label: "پیاده‌روی" },
  { key: "stretching", label: "نرمش" },
  { key: "group_activities", label: "فعالیت‌های گروهی" },
  { key: "game_entertainment", label: "بازی و سرگرمی" },
  { key: "music", label: "موسیقی" },
  { key: "art_craft", label: "نقاشی و کاردستی" },
  { key: "reading", label: "کتاب‌خوانی" },
  { key: "religious_cultural", label: "برنامه‌های مذهبی و فرهنگی" },
  { key: "celebrations", label: "جشن‌ها و مناسبت‌ها" },
  { key: "trips_outings", label: "گردش و اردو" },
  { key: "intergenerational", label: "برنامه‌های بین‌نسلی" },
  { key: "educational_class", label: "کلاس آموزشی" },
  { key: "group_psychology", label: "جلسات روان‌شناسی گروهی" },
  { key: "social_programs", label: "برنامه‌های اجتماعی" },
  { key: "creative_workshops", label: "کارگاه‌ها و فعالیت‌های خلاق" }
];

/** Unified checklist for panel daily-life (schedule flags + activity library slugs). */
export type DailyChecklistKind = "schedule" | "activity";

export const DAILY_ACTIVITY_CHECKLIST: {
  key: string;
  label: string;
  kind: DailyChecklistKind;
}[] = [
  { key: "wake_sleep", label: "ساعت بیدار شدن و خواب", kind: "schedule" },
  { key: "daily_routine", label: "برنامه روزانه", kind: "schedule" },
  { key: "light_exercise", label: "ورزش", kind: "activity" },
  { key: "walking", label: "پیاده‌روی", kind: "activity" },
  { key: "stretching", label: "نرمش", kind: "activity" },
  { key: "group_activities", label: "فعالیت‌های گروهی", kind: "activity" },
  { key: "game_entertainment", label: "بازی و سرگرمی", kind: "activity" },
  { key: "music", label: "موسیقی", kind: "activity" },
  { key: "art_craft", label: "نقاشی و کاردستی", kind: "activity" },
  { key: "reading", label: "کتاب‌خوانی", kind: "activity" },
  { key: "religious_cultural", label: "برنامه‌های مذهبی و فرهنگی", kind: "activity" },
  { key: "celebrations", label: "جشن‌ها و مناسبت‌ها", kind: "activity" },
  { key: "trips_outings", label: "گردش و اردو", kind: "activity" },
  { key: "intergenerational", label: "برنامه‌های بین‌نسلی", kind: "activity" },
  { key: "educational_class", label: "کلاس آموزشی", kind: "activity" },
  { key: "group_psychology", label: "جلسات روان‌شناسی گروهی", kind: "activity" },
  { key: "social_programs", label: "برنامه‌های اجتماعی", kind: "activity" },
  { key: "creative_workshops", label: "کارگاه‌ها و فعالیت‌های خلاق", kind: "activity" },
  { key: "special_needs", label: "برنامه ویژه سالمندان کم‌توان", kind: "schedule" },
  { key: "family_participation", label: "مشارکت خانواده", kind: "schedule" },
  { key: "weekly_sample", label: "نمونه برنامه هفتگی", kind: "schedule" }
];

/**
 * Catalog keys that historically diverged from the `activities.slug` seed.
 * Lookup and de-dupe must treat aliases as the same activity.
 */
const ACTIVITY_SLUG_ALIASES: Record<string, readonly string[]> = {
  game_entertainment: ["game_entertainment", "games_entertainment"],
  games_entertainment: ["games_entertainment", "game_entertainment"]
};

export function activitySlugCandidates(key: string): string[] {
  return [...(ACTIVITY_SLUG_ALIASES[key] || [key])];
}

export const FAMILY_VISIT_PRESETS: ProfileSectionPreset[] = [
  {
    key: "in_person_visit",
    label: "ملاقات حضوری",
    defaultValue: "هر روز ۱۰:۰۰ — ۱۹:۰۰",
    valueHint: "ساعات ملاقات حضوری"
  },
  {
    key: "video_call",
    label: "تماس تصویری روزانه",
    defaultValue: "هماهنگی روزانه",
    valueHint: "شرایط تماس تصویری"
  },
  {
    key: "communication_terms",
    label: "شرایط ارتباطی",
    defaultValue: "هماهنگی قبلی با پذیرش",
    valueHint: "شرایط ارتباط با خانواده"
  }
];

export const PROFILE_SECTION_META: Record<
  ProfileSectionKey,
  { title: string; hint: string; presets: ProfileSectionPreset[]; valueLabel: string }
> = {
  care_treatment: {
    title: "خدمات درمانی و مراقبتی",
    hint: "موارد فعال در بخش «مراقبت و درمان» صفحه عمومی مرکز نمایش داده می‌شوند. می‌توانید از فهرست پیش‌فرض انتخاب کنید یا مورد سفارشی اضافه کنید.",
    presets: CARE_TREATMENT_PRESETS,
    valueLabel: "توضیح (اختیاری)"
  },
  daily_life: {
    title: "برنامه روزانه و فعالیت‌ها",
    hint: "فعالیت‌های زندگی روزمره سالمندان را مدیریت کنید. موارد ذخیره‌شده در بخش «برنامه روزانه و فعالیت‌ها» صفحه عمومی نمایش داده می‌شوند.",
    presets: DAILY_LIFE_PRESETS,
    valueLabel: "توضیح (اختیاری)"
  },
  family_visit: {
    title: "ملاقات و ارتباط با خانواده",
    hint: "ساعات ملاقات، تماس تصویری و شرایط ارتباطی را ثبت کنید. این موارد بالای بخش نظرات در صفحه عمومی نمایش داده می‌شوند.",
    presets: FAMILY_VISIT_PRESETS,
    valueLabel: "جزئیات / ساعات"
  }
};

export function slugifyProfileKey(label: string) {
  const base = (label || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u0600-\u06FF_-]/g, "")
    .slice(0, 48);
  return base || `item_${Date.now()}`;
}

export function parseProfileSectionItems(raw: unknown): ProfileSectionItem[] {
  if (!raw) return [];
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = String(row.label || row.name || row.title || "").trim();
      const value = String(row.value || row.description || row.detail || "").trim();
      const key = String(row.key || row.id || slugifyProfileKey(label) || index);
      if (!label && !value) return null;
      return {
        key,
        label: label || value,
        value: label ? value : "",
        sort_order:
          typeof row.sort_order === "number" ? row.sort_order : index
      } as ProfileSectionItem;
    })
    .filter((item): item is ProfileSectionItem => Boolean(item));
}
