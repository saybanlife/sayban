/**
 * Care & treatment («مراقبت و درمان») vocabulary, shared by the public Center
 * page and the Panel manager.
 *
 * The database stores English canonical values only (see
 * `scripts/sql/center_care_treatment.sql`); the Persian labels live here so the
 * two surfaces can never drift apart.
 */

/** Selectable services stored in `centers__specialists.specialist_type`. */
export type SpecialistType =
  | "psychologist"
  | "psychiatrist"
  | "geriatrician"
  | "physiotherapist"
  | "occupational_therapist"
  | "social_worker"
  | "dentist"
  | "speech_therapist"
  | "medication_manager";

/** How often a service is provided (`centers__specialists.frequency`). */
export type CareFrequency = "daily" | "every_other_day" | "several_times_week";

/** Only meaningful for the doctor entry (`centers__specialists.doctor_kind`). */
export type DoctorKind = "general" | "specialist";

/** The doctor is stored in the same table but rendered as its own block. */
export const DOCTOR_TYPE = "doctor";

export type Option<T extends string> = { value: T; label: string };

/** Order drives the Panel checklist and the public list. */
export const SPECIALIST_TYPES: Option<SpecialistType>[] = [
  { value: "psychologist", label: "روانشناس" },
  { value: "psychiatrist", label: "روانپزشک" },
  { value: "geriatrician", label: "پزشک طب سالمندی" },
  { value: "physiotherapist", label: "فیزیوتراپیست" },
  { value: "occupational_therapist", label: "کاردرمانگر" },
  { value: "social_worker", label: "مددکار اجتماعی" },
  { value: "dentist", label: "دندان‌پزشک" },
  { value: "speech_therapist", label: "گفتاردرمانگر" },
  { value: "medication_manager", label: "مدیریت دارو" }
];

export const CARE_FREQUENCIES: Option<CareFrequency>[] = [
  { value: "daily", label: "روزانه" },
  { value: "every_other_day", label: "روز در میان" },
  { value: "several_times_week", label: "چند بار در هفته" }
];

export const DOCTOR_KINDS: Option<DoctorKind>[] = [
  { value: "general", label: "عمومی" },
  { value: "specialist", label: "متخصص" }
];

/**
 * Always-on facilities, seeded into the shared `centers__care_items` library.
 * Order drives the public list.
 */
export const CARE_FACILITY_SLUGS = [
  "caregiver_aide_24h",
  "dedicated_caregiver",
  "nutritionist",
  "hospital_cooperation"
] as const;

export const DOCTOR_LABEL = "پزشک";

function lookup<T extends string>(
  options: Option<T>[],
  value: unknown
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return options.find(option => option.value === raw)?.label ?? null;
}

/** Falls back to the raw value so unmapped legacy rows still render. */
export function specialistLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (raw === DOCTOR_TYPE) return DOCTOR_LABEL;
  return lookup(SPECIALIST_TYPES, raw) ?? raw;
}

export function frequencyLabel(value: unknown): string | null {
  return lookup(CARE_FREQUENCIES, value);
}

export function doctorKindLabel(value: unknown): string | null {
  return lookup(DOCTOR_KINDS, value);
}

export function isSpecialistType(value: unknown): value is SpecialistType {
  return SPECIALIST_TYPES.some(option => option.value === String(value ?? ""));
}

/**
 * Human-readable cadence for a service row, e.g.
 * «روزانه — هفته‌ای دو بار» or «شنبه و سه‌شنبه».
 */
export function careScheduleDetail(row: {
  frequency?: unknown;
  visit_interval?: unknown;
  days_of_week?: unknown;
}): string | null {
  const parts = [
    frequencyLabel(row.frequency),
    String(row.visit_interval ?? "").trim() || null,
    String(row.days_of_week ?? "").trim() || null
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(" — ") : null;
}
