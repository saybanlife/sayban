import {
  ACTIVITY_DAY_FA_OPTIONS,
  ADMISSION_GENDER_FA_OPTIONS,
  CARE_DOMAIN_FA_OPTIONS,
  CAREGIVER_TYPE_FA_OPTIONS,
  CENTER_TYPE_FA_OPTIONS,
  DISPATCH_LEAD_TIME_FA_OPTIONS,
  DISPATCH_TEHRAN_DISTRICT_FA_OPTIONS,
  DISPATCH_WORKFORCE_EXPERIENCE_FA_OPTIONS,
  DISPATCH_WORKFORCE_FA_OPTIONS,
  DISPATCH_WORKFORCE_TOP_FA_OPTIONS,
  DOCTOR_TYPE_FA_OPTIONS,
  LICENSE_TYPE_FA_OPTIONS,
  MIN_WORK_EXPERIENCE_UNIT_FA_OPTIONS,
  ROOM_TYPE_FA_OPTIONS,
  URGENT_DISPATCH_FA_OPTIONS,
  formatDispatchWorkforceDisplay,
  isKnownFaOption,
  isNursingGlanceProfile,
  localizeCenterFactValue,
  toDbEnumValue,
  toDbSetValue,
  toFaEnumValue,
  toFaOptionList
} from "../centerPage/centerEnumLocales";
import { isTimeRangeValid, parseTime } from "@/lib/datetime";

/** Persian labels shown in CenterPage selects (mapped to English on save). */
export const CENTER_TYPE_OPTIONS = CENTER_TYPE_FA_OPTIONS;
export const CARE_DOMAIN_OPTIONS = CARE_DOMAIN_FA_OPTIONS;
export const ADMISSION_GENDER_OPTIONS = ADMISSION_GENDER_FA_OPTIONS;
export const DOCTOR_TYPE_OPTIONS = DOCTOR_TYPE_FA_OPTIONS;
export const CAREGIVER_TYPE_OPTIONS = CAREGIVER_TYPE_FA_OPTIONS;
export const ROOM_TYPE_OPTIONS = ROOM_TYPE_FA_OPTIONS;
export const DISPATCH_WORKFORCE_OPTIONS = DISPATCH_WORKFORCE_FA_OPTIONS;
export const DISPATCH_WORKFORCE_TOP_OPTIONS = DISPATCH_WORKFORCE_TOP_FA_OPTIONS;
export const DISPATCH_WORKFORCE_EXPERIENCE_OPTIONS =
  DISPATCH_WORKFORCE_EXPERIENCE_FA_OPTIONS;
export const LICENSE_TYPE_OPTIONS = LICENSE_TYPE_FA_OPTIONS;
export const MIN_WORK_EXPERIENCE_UNIT_OPTIONS =
  MIN_WORK_EXPERIENCE_UNIT_FA_OPTIONS;
export const DISPATCH_TEHRAN_DISTRICT_OPTIONS =
  DISPATCH_TEHRAN_DISTRICT_FA_OPTIONS;
export const DISPATCH_LEAD_TIME_OPTIONS = DISPATCH_LEAD_TIME_FA_OPTIONS;
export const URGENT_DISPATCH_OPTIONS = URGENT_DISPATCH_FA_OPTIONS;
export const ACTIVITY_DAY_OPTIONS = ACTIVITY_DAY_FA_OPTIONS;

export type CenterTypeOption = (typeof CENTER_TYPE_OPTIONS)[number];
export type AdmissionGenderOption = (typeof ADMISSION_GENDER_OPTIONS)[number];
export type DoctorTypeOption = (typeof DOCTOR_TYPE_OPTIONS)[number];
export type CaregiverTypeOption = (typeof CAREGIVER_TYPE_OPTIONS)[number];
export type RoomTypeOption = (typeof ROOM_TYPE_OPTIONS)[number];
export type DispatchWorkforceOption =
  (typeof DISPATCH_WORKFORCE_OPTIONS)[number];
export type LicenseTypeOption = (typeof LICENSE_TYPE_OPTIONS)[number];
export type MinWorkExperienceUnitOption =
  (typeof MIN_WORK_EXPERIENCE_UNIT_OPTIONS)[number];
export type DispatchTehranDistrictOption =
  (typeof DISPATCH_TEHRAN_DISTRICT_OPTIONS)[number];
export type DispatchLeadTimeOption =
  (typeof DISPATCH_LEAD_TIME_OPTIONS)[number];
export type UrgentDispatchOption = (typeof URGENT_DISPATCH_OPTIONS)[number];
export type ActivityDayOption = (typeof ACTIVITY_DAY_OPTIONS)[number];

export type CenterOverviewFacts = {
  /** Persian UI value — روزانه / شبانه‌روزی / هر دو */
  center_type: string;
  /** Persian UI value — سالمندان / پرستاری / هر دو */
  care_domain: string;
  /** Persian UI value */
  admission_gender: string;
  /** Elderly-only */
  total_capacity: string;
  founded_year: string;
  care_staff_count: string;
  /** Nursing / both */
  active_staff_count: string;
  min_work_experience_value: string;
  /** Persian UI value — سال / ماه */
  min_work_experience_unit: string;
  /** Persian UI labels (multi) */
  dispatch_tehran_districts: DispatchTehranDistrictOption[];
  /** Persian UI value */
  dispatch_lead_time: string;
  /** Persian UI value */
  urgent_dispatch: string;
  /** Persian UI labels (multi) */
  activity_days: ActivityDayOption[];
  /** Canonical HH:mm */
  response_hours_start: string;
  /** Canonical HH:mm */
  response_hours_end: string;
};

export type CenterGlanceFacts = {
  min_monthly_fee: string;
  max_monthly_fee: string;
  has_night_nurse: boolean;
  /** Elderly-only (hidden for nursing glance profile) */
  distance_to_hospital_km: string;
  /** Elderly-only — Persian UI value */
  doctor_type: string;
  /** Elderly-only — Persian UI value */
  caregiver_type: string;
  /** Elderly-only — Persian UI labels */
  room_types: RoomTypeOption[];
  /** Nursing / both — Persian UI labels (multi) */
  dispatch_workforce_types: DispatchWorkforceOption[];
  /** Nursing / both — Persian UI value */
  license_type: string;
};

export const EMPTY_OVERVIEW_FACTS: CenterOverviewFacts = {
  center_type: "",
  care_domain: "",
  admission_gender: "",
  total_capacity: "",
  founded_year: "",
  care_staff_count: "",
  active_staff_count: "",
  min_work_experience_value: "",
  min_work_experience_unit: "",
  dispatch_tehran_districts: [],
  dispatch_lead_time: "",
  urgent_dispatch: "",
  activity_days: [],
  response_hours_start: "",
  response_hours_end: ""
};

export const EMPTY_GLANCE_FACTS: CenterGlanceFacts = {
  min_monthly_fee: "",
  max_monthly_fee: "",
  has_night_nurse: false,
  distance_to_hospital_km: "",
  doctor_type: "",
  caregiver_type: "",
  room_types: [],
  dispatch_workforce_types: [],
  license_type: ""
};

const OVERVIEW_LABELS: Record<keyof CenterOverviewFacts, string> = {
  center_type: "زمان فعالیت مرکز",
  care_domain: "نوع مراقبت",
  admission_gender: "پذیرش",
  total_capacity: "ظرفیت کل مرکز",
  founded_year: "سال تأسیس",
  care_staff_count: "تعداد کادر مراقبتی",
  active_staff_count: "تعداد نیروی فعال",
  min_work_experience_value: "حداقل سابقه کاری",
  min_work_experience_unit: "واحد سابقه کاری",
  dispatch_tehran_districts: "مناطق تحت پوشش",
  dispatch_lead_time: "حداقل زمان اعزام",
  urgent_dispatch: "اعزام فوری",
  activity_days: "روزهای فعالیت",
  response_hours_start: "ساعات پاسخ‌گویی",
  response_hours_end: "ساعت پایان پاسخ‌گویی"
};

const GLANCE_LABELS: Record<keyof CenterGlanceFacts, string> = {
  min_monthly_fee: "حداقل هزینه ماهانه",
  max_monthly_fee: "حداکثر هزینه ماهانه",
  has_night_nurse: "حضور پرستار شبانه‌روزی",
  distance_to_hospital_km: "نزدیکی به بیمارستان (کیلومتر)",
  doctor_type: "نوع پزشک",
  caregiver_type: "نوع مراقب یا پرستار",
  room_types: "نوع اتاق‌ها",
  dispatch_workforce_types: "نوع نیروی قابل اعزام",
  license_type: "نوع مجوز مرکز"
};

/** Elderly-only overview keys (not shown for nursing / both). */
const ELDERLY_ONLY_OVERVIEW_KEYS: (keyof CenterOverviewFacts)[] = [
  "total_capacity"
];

/** Nursing / both overview keys (not shown for elderly-only). */
const NURSING_ONLY_OVERVIEW_KEYS: (keyof CenterOverviewFacts)[] = [
  "active_staff_count",
  "min_work_experience_value",
  "min_work_experience_unit",
  "dispatch_tehran_districts",
  "dispatch_lead_time",
  "urgent_dispatch",
  "activity_days",
  "response_hours_start",
  "response_hours_end"
];

/** Display order for overview rows (unit / end-time are composed into siblings). */
const OVERVIEW_DISPLAY_ORDER: (keyof CenterOverviewFacts)[] = [
  "center_type",
  "care_domain",
  "admission_gender",
  "total_capacity",
  "active_staff_count",
  "min_work_experience_value",
  "dispatch_tehran_districts",
  "dispatch_lead_time",
  "urgent_dispatch",
  "activity_days",
  "response_hours_start",
  "founded_year",
  "care_staff_count"
];

/** Elderly-only glance keys (not shown for nursing / both). */
const ELDERLY_ONLY_GLANCE_KEYS: (keyof CenterGlanceFacts)[] = [
  "distance_to_hospital_km",
  "doctor_type",
  "caregiver_type",
  "room_types"
];

/** Nursing / both glance keys (not shown for elderly-only). */
const NURSING_ONLY_GLANCE_KEYS: (keyof CenterGlanceFacts)[] = [
  "dispatch_workforce_types",
  "license_type"
];

function asText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (Array.isArray(value)) {
    return value
      .map(v => String(v).trim())
      .filter(Boolean)
      .join(" / ");
  }
  return String(value).trim();
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  const n = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "بله", "آری", "اری"].includes(n);
}

function parseRoomTypes(value: unknown): RoomTypeOption[] {
  return toFaOptionList("room_types", value).filter((item): item is RoomTypeOption =>
    (ROOM_TYPE_OPTIONS as readonly string[]).includes(item)
  );
}

function parseDispatchWorkforce(value: unknown): DispatchWorkforceOption[] {
  return toFaOptionList("dispatch_workforce_types", value).filter(
    (item): item is DispatchWorkforceOption =>
      (DISPATCH_WORKFORCE_OPTIONS as readonly string[]).includes(item)
  );
}

function parseTehranDistricts(value: unknown): DispatchTehranDistrictOption[] {
  let items = toFaOptionList("dispatch_tehran_districts", value).filter(
    (item): item is DispatchTehranDistrictOption =>
      (DISPATCH_TEHRAN_DISTRICT_OPTIONS as readonly string[]).includes(item)
  );
  if (items.includes("سراسر تهران")) {
    // Citywide covers districts 1–22; Karaj stays independent.
    items = items.filter(item => item === "سراسر تهران" || item === "کرج");
  }
  const order = new Map(
    DISPATCH_TEHRAN_DISTRICT_OPTIONS.map((option, index) => [option, index])
  );
  return [...items].sort(
    (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99)
  );
}

function parseActivityDays(value: unknown): ActivityDayOption[] {
  return toFaOptionList("activity_days", value).filter(
    (item): item is ActivityDayOption =>
      (ACTIVITY_DAY_OPTIONS as readonly string[]).includes(item)
  );
}

function normalizeTimeValue(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  return parseTime(text) || text;
}

export { isNursingGlanceProfile };

/**
 * Load API/DB values into Persian form state.
 * Accepts English canonical values and legacy Persian DB values.
 */
export function factsFromCenterResult(result?: Record<string, unknown> | null): {
  overview: CenterOverviewFacts;
  glance: CenterGlanceFacts;
} {
  const src = result || {};
  return {
    overview: {
      center_type: toFaEnumValue("center_type", src.center_type),
      care_domain: toFaEnumValue("care_domain", src.care_domain),
      admission_gender: toFaEnumValue(
        "admission_gender",
        src.admission_gender
      ),
      total_capacity: asText(src.total_capacity),
      founded_year: asText(src.founded_year),
      care_staff_count: asText(src.care_staff_count),
      active_staff_count: asText(src.active_staff_count),
      min_work_experience_value: asText(src.min_work_experience_value),
      min_work_experience_unit: toFaEnumValue(
        "min_work_experience_unit",
        src.min_work_experience_unit
      ),
      dispatch_tehran_districts: parseTehranDistricts(
        src.dispatch_tehran_districts
      ),
      dispatch_lead_time: toFaEnumValue(
        "dispatch_lead_time",
        src.dispatch_lead_time
      ),
      urgent_dispatch: toFaEnumValue("urgent_dispatch", src.urgent_dispatch),
      activity_days: parseActivityDays(src.activity_days),
      response_hours_start: normalizeTimeValue(src.response_hours_start),
      response_hours_end: normalizeTimeValue(src.response_hours_end)
    },
    glance: {
      min_monthly_fee: asText(src.min_monthly_fee),
      max_monthly_fee: asText(src.max_monthly_fee),
      has_night_nurse: parseBoolean(src.has_night_nurse),
      distance_to_hospital_km: asText(src.distance_to_hospital_km),
      doctor_type: toFaEnumValue("doctor_type", src.doctor_type),
      caregiver_type: toFaEnumValue("caregiver_type", src.caregiver_type),
      room_types: parseRoomTypes(src.room_types),
      dispatch_workforce_types: parseDispatchWorkforce(
        src.dispatch_workforce_types
      ),
      license_type: toFaEnumValue("license_type", src.license_type)
    }
  };
}

function overviewKeysForCareDomain(
  careDomain: unknown
): (keyof CenterOverviewFacts)[] {
  const nursing = isNursingGlanceProfile(careDomain);
  return OVERVIEW_DISPLAY_ORDER.filter(key => {
    if (nursing && ELDERLY_ONLY_OVERVIEW_KEYS.includes(key)) return false;
    if (!nursing && NURSING_ONLY_OVERVIEW_KEYS.includes(key)) return false;
    return true;
  });
}

export function overviewDisplayRows(facts: CenterOverviewFacts) {
  const keys = overviewKeysForCareDomain(facts.care_domain);
  return keys.map(key => {
    let value = "—";
    if (
      key === "center_type" ||
      key === "care_domain" ||
      key === "admission_gender" ||
      key === "dispatch_lead_time" ||
      key === "urgent_dispatch"
    ) {
      const localized = localizeCenterFactValue(key, facts[key]);
      value = localized || "—";
    } else if (key === "min_work_experience_value") {
      const amount = String(facts.min_work_experience_value || "").trim();
      const unit =
        localizeCenterFactValue(
          "min_work_experience_unit",
          facts.min_work_experience_unit
        ) || String(facts.min_work_experience_unit || "").trim();
      value = amount && unit ? `${amount} ${unit}` : amount || "—";
    } else if (key === "dispatch_tehran_districts") {
      value = facts.dispatch_tehran_districts.length
        ? localizeCenterFactValue(
            "dispatch_tehran_districts",
            facts.dispatch_tehran_districts
          )
        : "—";
    } else if (key === "activity_days") {
      value = facts.activity_days.length
        ? localizeCenterFactValue("activity_days", facts.activity_days)
        : "—";
    } else if (key === "response_hours_start") {
      const start = String(facts.response_hours_start || "").trim();
      const end = String(facts.response_hours_end || "").trim();
      value = start && end ? `${start} تا ${end}` : start || end || "—";
    } else if (facts[key]) {
      value = String(facts[key]);
    }
    return {
      key,
      label: OVERVIEW_LABELS[key],
      value
    };
  });
}

function glanceKeysForCareDomain(
  careDomain: unknown
): (keyof CenterGlanceFacts)[] {
  const nursing = isNursingGlanceProfile(careDomain);
  return (Object.keys(GLANCE_LABELS) as (keyof CenterGlanceFacts)[]).filter(
    key => {
      if (nursing && ELDERLY_ONLY_GLANCE_KEYS.includes(key)) return false;
      if (!nursing && NURSING_ONLY_GLANCE_KEYS.includes(key)) return false;
      return true;
    }
  );
}

export function glanceDisplayRows(
  facts: CenterGlanceFacts,
  careDomain?: unknown
) {
  const keys = glanceKeysForCareDomain(careDomain ?? "");
  return keys.map(key => {
    let value = "—";
    if (key === "has_night_nurse") {
      value = facts.has_night_nurse ? "بله" : "خیر";
    } else if (key === "room_types") {
      value = facts.room_types.length
        ? localizeCenterFactValue("room_types", facts.room_types)
        : "—";
    } else if (key === "dispatch_workforce_types") {
      value = facts.dispatch_workforce_types.length
        ? formatDispatchWorkforceDisplay(facts.dispatch_workforce_types)
        : "—";
    } else if (
      key === "doctor_type" ||
      key === "caregiver_type" ||
      key === "license_type"
    ) {
      const localized = localizeCenterFactValue(key, facts[key]);
      value = localized || "—";
    } else if (facts[key]) {
      value = String(facts[key]);
    }
    return { key, label: GLANCE_LABELS[key], value };
  });
}

function isPositiveInt(raw: string) {
  if (!/^\d+$/.test(raw.trim())) return false;
  return Number(raw) > 0;
}

function isNonNegativeNumber(raw: string) {
  if (!/^\d+(\.\d+)?$/.test(raw.trim())) return false;
  return Number(raw) >= 0;
}

function isPositiveNumber(raw: string) {
  if (!/^\d+(\.\d+)?$/.test(raw.trim())) return false;
  return Number(raw) > 0;
}

/** Approx current Jalali year upper bound for founded_year validation. */
function maxFoundedYear() {
  // Gregorian 2026 ≈ 1404/1405; allow a small buffer.
  return 1410;
}

function validateNursingOverview(form: CenterOverviewFacts): string | null {
  if (!isPositiveInt(form.active_staff_count)) {
    return "تعداد نیروی فعال باید عدد صحیح مثبت باشد.";
  }
  if (!isPositiveInt(form.min_work_experience_value)) {
    return "حداقل سابقه کاری باید عدد صحیح مثبت باشد.";
  }
  if (
    !isKnownFaOption("min_work_experience_unit", form.min_work_experience_unit)
  ) {
    return "واحد سابقه کاری را سال یا ماه انتخاب کنید.";
  }
  if (!form.dispatch_tehran_districts.length) {
    return "حداقل یک منطقه اعزام را انتخاب کنید.";
  }
  if (
    form.dispatch_tehran_districts.some(
      item => !isKnownFaOption("dispatch_tehran_districts", item)
    )
  ) {
    return "مناطق تحت پوشش فقط باید از مقادیر مجاز باشد.";
  }
  if (!isKnownFaOption("dispatch_lead_time", form.dispatch_lead_time)) {
    return "حداقل زمان لازم برای اعزام را از فهرست انتخاب کنید.";
  }
  if (!isKnownFaOption("urgent_dispatch", form.urgent_dispatch)) {
    return "وضعیت اعزام فوری را از فهرست انتخاب کنید.";
  }
  if (!form.activity_days.length) {
    return "حداقل یک روز فعالیت را انتخاب کنید.";
  }
  if (
    form.activity_days.some(item => !isKnownFaOption("activity_days", item))
  ) {
    return "روزهای فعالیت فقط باید از مقادیر مجاز باشد.";
  }
  const start = parseTime(form.response_hours_start);
  const end = parseTime(form.response_hours_end);
  if (!start || !end) {
    return "ساعات پاسخ‌گویی (شروع و پایان) را مشخص کنید.";
  }
  if (!isTimeRangeValid(start, end)) {
    return "ساعت پایان پاسخ‌گویی باید بعد از ساعت شروع باشد.";
  }
  return null;
}

export function validateOverviewFacts(
  form: CenterOverviewFacts
): string | null {
  if (!isKnownFaOption("center_type", form.center_type)) {
    return "زمان فعالیت مرکز را از فهرست مجاز انتخاب کنید.";
  }
  if (!isKnownFaOption("care_domain", form.care_domain)) {
    return "نوع مراقبت را از فهرست مجاز انتخاب کنید.";
  }
  if (!isKnownFaOption("admission_gender", form.admission_gender)) {
    return "نوع پذیرش را از فهرست مجاز انتخاب کنید.";
  }
  if (isNursingGlanceProfile(form.care_domain)) {
    const nursingError = validateNursingOverview(form);
    if (nursingError) return nursingError;
  } else if (!isPositiveInt(form.total_capacity)) {
    return "ظرفیت کل باید عدد صحیح مثبت باشد.";
  }
  if (!/^\d{4}$/.test(form.founded_year.trim())) {
    return "سال تأسیس باید عدد چهاررقمی باشد.";
  }
  const year = Number(form.founded_year);
  if (year < 1300 || year > maxFoundedYear()) {
    return `سال تأسیس باید بین ۱۳۰۰ تا ${maxFoundedYear()} باشد.`;
  }
  if (!isPositiveInt(form.care_staff_count)) {
    return "تعداد کادر مراقبتی باید عدد صحیح مثبت باشد.";
  }
  return null;
}

export function validateGlanceFacts(
  form: CenterGlanceFacts,
  careDomain?: unknown
): string | null {
  if (!isPositiveNumber(form.min_monthly_fee)) {
    return "حداقل هزینه ماهانه باید عدد معتبر و بزرگ‌تر از صفر باشد.";
  }
  if (!isPositiveNumber(form.max_monthly_fee)) {
    return "حداکثر هزینه ماهانه باید عدد معتبر و بزرگ‌تر از صفر باشد.";
  }
  if (Number(form.min_monthly_fee) > Number(form.max_monthly_fee)) {
    return "حداقل هزینه نمی‌تواند از حداکثر هزینه بیشتر باشد.";
  }
  if (typeof form.has_night_nurse !== "boolean") {
    return "وضعیت پرستار شبانه‌روزی نامعتبر است.";
  }

  if (isNursingGlanceProfile(careDomain)) {
    if (!form.dispatch_workforce_types.length) {
      return "حداقل یک نوع نیروی قابل اعزام را انتخاب کنید.";
    }
    if (
      form.dispatch_workforce_types.some(
        item => !isKnownFaOption("dispatch_workforce_types", item)
      )
    ) {
      return "نوع نیروی قابل اعزام فقط باید از مقادیر مجاز باشد.";
    }
    if (!isKnownFaOption("license_type", form.license_type)) {
      return "نوع مجوز مرکز را از فهرست مجاز انتخاب کنید.";
    }
    return null;
  }

  if (!isNonNegativeNumber(form.distance_to_hospital_km)) {
    return "فاصله تا بیمارستان باید عدد معتبر (۰ یا بیشتر) باشد.";
  }
  if (!isKnownFaOption("doctor_type", form.doctor_type)) {
    return "نوع پزشک را از فهرست مجاز انتخاب کنید.";
  }
  if (!isKnownFaOption("caregiver_type", form.caregiver_type)) {
    return "نوع مراقب یا پرستار را از فهرست مجاز انتخاب کنید.";
  }
  if (!form.room_types.length) {
    return "حداقل یک نوع اتاق را انتخاب کنید.";
  }
  if (form.room_types.some(item => !isKnownFaOption("room_types", item))) {
    return "نوع اتاق‌ها فقط باید از مقادیر مجاز باشد.";
  }
  return null;
}

const CLEARED_NURSING_OVERVIEW = {
  active_staff_count: null,
  min_work_experience_value: null,
  min_work_experience_unit: null,
  dispatch_tehran_districts: null,
  dispatch_lead_time: null,
  urgent_dispatch: null,
  activity_days: null,
  response_hours_start: null,
  response_hours_end: null
} as const;

/** Persian UI form → English DB payload for POST /panel/update/info */
export function overviewFactsPayload(form: CenterOverviewFacts) {
  const centerType = toDbEnumValue("center_type", form.center_type);
  const careDomain = toDbEnumValue("care_domain", form.care_domain);
  const admission = toDbEnumValue("admission_gender", form.admission_gender);
  if (!centerType || !careDomain || !admission) {
    throw new Error("Invalid overview enum mapping");
  }

  const shared = {
    center_type: centerType,
    care_domain: careDomain,
    admission_gender: admission,
    founded_year: Number(form.founded_year),
    care_staff_count: Number(form.care_staff_count)
  };

  if (isNursingGlanceProfile(form.care_domain)) {
    const experienceUnit = toDbEnumValue(
      "min_work_experience_unit",
      form.min_work_experience_unit
    );
    const districts = toDbSetValue(
      "dispatch_tehran_districts",
      form.dispatch_tehran_districts
    );
    const leadTime = toDbEnumValue(
      "dispatch_lead_time",
      form.dispatch_lead_time
    );
    const urgent = toDbEnumValue("urgent_dispatch", form.urgent_dispatch);
    const days = toDbSetValue("activity_days", form.activity_days);
    const start = parseTime(form.response_hours_start);
    const end = parseTime(form.response_hours_end);
    if (
      !experienceUnit ||
      !districts ||
      !leadTime ||
      !urgent ||
      !days ||
      !start ||
      !end
    ) {
      throw new Error("Invalid nursing overview enum mapping");
    }
    return {
      ...shared,
      total_capacity: null,
      active_staff_count: Number(form.active_staff_count),
      min_work_experience_value: Number(form.min_work_experience_value),
      min_work_experience_unit: experienceUnit,
      dispatch_tehran_districts: districts,
      dispatch_lead_time: leadTime,
      urgent_dispatch: urgent,
      activity_days: days,
      response_hours_start: start,
      response_hours_end: end
    };
  }

  return {
    ...shared,
    total_capacity: Number(form.total_capacity),
    ...CLEARED_NURSING_OVERVIEW
  };
}

/** Persian UI form → English DB payload for POST /panel/update/info */
export function glanceFactsPayload(
  form: CenterGlanceFacts,
  careDomain?: unknown
) {
  const base = {
    min_monthly_fee: Number(form.min_monthly_fee),
    max_monthly_fee: Number(form.max_monthly_fee),
    has_night_nurse: form.has_night_nurse
  };

  if (isNursingGlanceProfile(careDomain)) {
    const dispatch = toDbSetValue(
      "dispatch_workforce_types",
      form.dispatch_workforce_types
    );
    const licenseType = toDbEnumValue("license_type", form.license_type);
    if (!dispatch || !licenseType) {
      throw new Error("Invalid nursing glance enum mapping");
    }
    return {
      ...base,
      dispatch_workforce_types: dispatch,
      license_type: licenseType,
      // Clear elderly-only fields so they do not linger on nursing profiles.
      distance_to_hospital_km: null,
      doctor_type: null,
      caregiver_type: null,
      room_types: null
    };
  }

  const doctorType = toDbEnumValue("doctor_type", form.doctor_type);
  const caregiverType = toDbEnumValue("caregiver_type", form.caregiver_type);
  const roomTypes = toDbSetValue("room_types", form.room_types);
  if (!doctorType || !caregiverType || !roomTypes) {
    throw new Error("Invalid glance enum mapping");
  }
  return {
    ...base,
    distance_to_hospital_km: Number(form.distance_to_hospital_km),
    doctor_type: doctorType,
    caregiver_type: caregiverType,
    room_types: roomTypes
  };
}
