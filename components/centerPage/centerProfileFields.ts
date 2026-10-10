import {
  CenterAmenityItem,
  CenterResult,
  CenterServiceItem,
  CenterTag,
  KeyInfoItem,
  KeyInfoRawItem,
  getAmenityItems
} from "./centerHelpers";
import {
  formatDispatchWorkforceDisplay,
  isNursingGlanceProfile,
  localizeCenterFactValue
} from "./centerEnumLocales";
import {
  CARE_FACILITY_SLUGS,
  DOCTOR_LABEL,
  DOCTOR_TYPE,
  SPECIALIST_TYPES,
  careScheduleDetail,
  doctorKindLabel,
  specialistLabel
} from "./careTreatmentVocab";

export type ProfileFieldItem = {
  key: string;
  label: string;
  value: string;
};

export type CareTreatmentItem = {
  id: string;
  label: string;
  detail?: string;
  available: boolean;
  keywords: string[];
};

function normalizeText(value?: string) {
  return (value || "")
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeyInfoItem(
  item: KeyInfoRawItem | CenterTag
): KeyInfoItem | null {
  const label =
    ("label" in item ? item.label : undefined) ||
    item.name ||
    ("title" in item ? item.title : undefined) ||
    ("tag_name" in item ? item.tag_name : undefined) ||
    "";
  const value =
    ("value" in item ? item.value : undefined) ||
    ("description" in item ? item.description : undefined) ||
    ("body" in item ? item.body : undefined) ||
    ("tag_value" in item ? item.tag_value : undefined) ||
    "";
  if (!label && !value) return null;
  return { label: label || value, value: label ? value : "" };
}

function collectLabeledItems(result?: CenterResult): KeyInfoItem[] {
  if (!result) return [];

  const structured =
    result.key_info || result.key_infos || result.attributes || [];
  const fromStructured = Array.isArray(structured)
    ? structured
        .map(normalizeKeyInfoItem)
        .filter((item): item is KeyInfoItem => Boolean(item))
    : [];

  const fromTags = Array.isArray(result.tags)
    ? result.tags
        .map(normalizeKeyInfoItem)
        .filter((item): item is KeyInfoItem => Boolean(item))
    : [];

  const merged = [...fromStructured, ...fromTags];
  const seen = new Set<string>();
  return merged.filter(item => {
    const key = `${normalizeText(item.label)}::${normalizeText(item.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readDirectField(result: CenterResult | undefined, keys: string[]) {
  if (!result) return "";
  const record = result as Record<string, unknown>;
  for (const key of keys) {
    const raw = record[key];
    if (raw == null || raw === "") continue;
    if (Array.isArray(raw)) {
      const joined = raw
        .map(v => String(v).trim())
        .filter(Boolean)
        .join(" / ");
      if (joined) return joined;
      continue;
    }
    if (typeof raw === "boolean") return raw ? "بله" : "خیر";
    const text = String(raw).trim();
    if (text) return text;
  }
  return "";
}

function findByLabels(items: KeyInfoItem[], labels: string[]) {
  const normalizedLabels = labels.map(normalizeText).filter(Boolean);
  return items.find(item => {
    const label = normalizeText(item.label);
    return normalizedLabels.some(
      candidate => label === candidate || label.includes(candidate)
    );
  });
}

function resolveField(
  result: CenterResult | undefined,
  items: KeyInfoItem[],
  labels: string[],
  directKeys: string[] = []
) {
  const direct = readDirectField(result, directKeys);
  if (direct) return direct;
  const match = findByLabels(items, labels);
  if (!match) return "";
  return (match.value || match.label || "").trim();
}

function localizeResolvedFact(
  key: string,
  value: string
): string {
  if (!value) return "";
  switch (key) {
    case "center_type":
      return localizeCenterFactValue("center_type", value);
    case "care_domain":
      return localizeCenterFactValue("care_domain", value);
    case "admission":
      return localizeCenterFactValue("admission_gender", value);
    case "doctor_type":
      return localizeCenterFactValue("doctor_type", value);
    case "caregiver_type":
      return localizeCenterFactValue("caregiver_type", value);
    case "room_types":
      return localizeCenterFactValue("room_types", value);
    case "dispatch_workforce_types":
      return formatDispatchWorkforceDisplay(value);
    case "license_type":
      return localizeCenterFactValue("license_type", value);
    case "dispatch_tehran_districts":
      return localizeCenterFactValue("dispatch_tehran_districts", value);
    case "dispatch_lead_time":
      return localizeCenterFactValue("dispatch_lead_time", value);
    case "urgent_dispatch":
      return localizeCenterFactValue("urgent_dispatch", value);
    case "activity_days":
      return localizeCenterFactValue("activity_days", value);
    default:
      return value;
  }
}

function formatYesNo(value: string) {
  const n = normalizeText(value);
  if (!n) return "";
  if (["1", "true", "yes", "بله", "هست", "دارد", "آری", "اری"].includes(n)) {
    return "بله";
  }
  if (["0", "false", "no", "خیر", "نیست", "ندارد"].includes(n)) {
    return "خیر";
  }
  return value.trim();
}

function formatDistance(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/[کمتمتر]|km|m\b/i.test(trimmed)) return trimmed;
  const num = Number(String(trimmed).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return trimmed;
  if (num >= 1000) {
    const km = num / 1000;
    const text = Number.isInteger(km) ? String(km) : km.toFixed(1);
    return `${text} کیلومتر`;
  }
  return `${Math.round(num)} متر`;
}

function formatMonthlyCost(minRaw: string, maxRaw: string) {
  const min = minRaw.trim();
  const max = maxRaw.trim();
  if (min && max) {
    if (min === max) return min;
    return `${min} / ${max}`;
  }
  return min || max;
}

const META_DEFS: {
  key: string;
  label: string;
  labels?: string[];
  directKeys?: string[];
  resolve?: (
    result: CenterResult | undefined,
    items: KeyInfoItem[]
  ) => string;
}[] = [
  {
    key: "care_domain",
    label: "نوع مرکز",
    labels: ["نوع مراقبت", "care domain", "care_domain"],
    directKeys: ["care_domain", "careDomain"]
  },
  {
    key: "center_type",
    label: "زمان فعالیت",
    labels: ["زمان فعالیت مرکز", "نوع مرکز", "center type", "center_type"],
    directKeys: ["center_type", "type", "centerType"]
  },
  {
    key: "admission",
    label: "پذیرش",
    labels: ["پذیرش", "نوع پذیرش", "admission", "admission_type"],
    directKeys: [
      "admission",
      "admission_type",
      "admissionType",
      "gender_admission",
      "admission_gender"
    ]
  },
  {
    key: "capacity",
    label: "ظرفیت مرکز",
    labels: ["ظرفیت کل مرکز", "ظرفیت کل", "ظرفیت", "capacity"],
    directKeys: ["capacity", "total_capacity", "totalCapacity"]
  },
  {
    key: "active_staff_count",
    label: "تعداد نیروی فعال",
    labels: ["تعداد نیروی فعال", "نیروی فعال", "active_staff_count"],
    directKeys: ["active_staff_count", "activeStaffCount"]
  },
  {
    key: "min_work_experience",
    label: "حداقل سابقه کاری",
    resolve: (result, items) => {
      const amount = resolveField(
        result,
        items,
        ["حداقل سابقه کاری", "سابقه کاری", "min_work_experience"],
        [
          "min_work_experience_value",
          "minWorkExperienceValue",
          "min_work_experience"
        ]
      );
      if (!amount) return "";
      const unitRaw = resolveField(
        result,
        items,
        ["واحد سابقه کاری", "min_work_experience_unit"],
        ["min_work_experience_unit", "minWorkExperienceUnit"]
      );
      const unit = unitRaw
        ? localizeCenterFactValue("min_work_experience_unit", unitRaw)
        : "";
      return unit ? `${amount} ${unit}` : amount;
    }
  },
  {
    key: "dispatch_tehran_districts",
    label: "مناطق تحت پوشش",
    labels: [
      "مناطق تحت پوشش",
      "در کدام مناطق تهران اعزام دارید؟",
      "مناطق اعزام در تهران",
      "مناطق اعزام",
      "dispatch_tehran_districts"
    ],
    directKeys: [
      "dispatch_tehran_districts",
      "dispatchTehranDistricts"
    ]
  },
  {
    key: "dispatch_lead_time",
    label: "حداقل زمان اعزام",
    labels: [
      "حداقل زمان لازم برای اعزام نیرو چقدر است؟",
      "حداقل زمان اعزام",
      "dispatch_lead_time"
    ],
    directKeys: ["dispatch_lead_time", "dispatchLeadTime"]
  },
  {
    key: "urgent_dispatch",
    label: "اعزام فوری",
    labels: [
      "آیا اعزام فوری دارید؟",
      "اعزام فوری",
      "urgent_dispatch"
    ],
    directKeys: ["urgent_dispatch", "urgentDispatch"]
  },
  {
    key: "activity_days",
    label: "روزهای فعالیت",
    labels: [
      "روزهای فعالیت مرکز چیست؟",
      "روزهای فعالیت",
      "activity_days"
    ],
    directKeys: ["activity_days", "activityDays"]
  },
  {
    key: "response_hours",
    label: "ساعات پاسخ‌گویی",
    resolve: (result, items) => {
      const combined = resolveField(
        result,
        items,
        ["ساعات پاسخ‌گویی چیست؟", "ساعات پاسخ‌گویی", "response_hours"],
        ["response_hours", "responseHours"]
      );
      if (combined) return combined;
      const start = resolveField(
        result,
        items,
        ["ساعت شروع پاسخ‌گویی", "response_hours_start"],
        ["response_hours_start", "responseHoursStart"]
      );
      const end = resolveField(
        result,
        items,
        ["ساعت پایان پاسخ‌گویی", "response_hours_end"],
        ["response_hours_end", "responseHoursEnd"]
      );
      if (start && end) return `${start} تا ${end}`;
      return start || end;
    }
  },
  {
    key: "founded_year",
    label: "سال تأسیس",
    labels: ["سال تأسیس", "سال تاسیس", "تأسیس", "تاسیس", "founded"],
    directKeys: [
      "founded_year",
      "established_year",
      "foundedYear",
      "year_founded"
    ]
  },
  {
    key: "care_staff_count",
    label: "کادر مراقبتی",
    labels: ["تعداد کادر مراقبتی", "کادر مراقبتی", "care staff"],
    directKeys: ["care_staff_count", "staff_count", "careStaffCount"]
  }
];

/** Elderly-only meta keys hidden on nursing / both public profiles. */
const ELDERLY_ONLY_META_KEYS = new Set(["capacity"]);

/** Nursing / both meta keys hidden on elderly-only public profiles. */
const NURSING_ONLY_META_KEYS = new Set([
  "active_staff_count",
  "min_work_experience",
  "dispatch_tehran_districts",
  "dispatch_lead_time",
  "urgent_dispatch",
  "activity_days",
  "response_hours"
]);

const GLANCE_DEFS: {
  key: string;
  label: string;
  labels?: string[];
  directKeys?: string[];
  resolve?: (
    result: CenterResult | undefined,
    items: KeyInfoItem[]
  ) => string;
}[] = [
  {
    key: "monthly_cost",
    label: "هزینه ماهانه",
    resolve: (result, items) => {
      const combined = resolveField(
        result,
        items,
        [
          "حداقل هزینه ماهانه / حداکثر هزینه ماهانه",
          "هزینه ماهانه",
          "حداقل / حداکثر هزینه"
        ],
        ["monthly_cost", "monthlyCost", "cost_range"]
      );
      if (combined) return combined;
      const min = resolveField(
        result,
        items,
        ["حداقل هزینه ماهانه", "حداقل هزینه", "min cost", "min_monthly_cost"],
        ["min_monthly_cost", "minMonthlyCost", "min_cost","min_monthly_fee"]
      );
      const max = resolveField(
        result,
        items,
        ["حداکثر هزینه ماهانه", "حداکثر هزینه", "max cost", "max_monthly_cost"],
        ["max_monthly_cost", "maxMonthlyCost", "max_cost","max_monthly_fee"]
      );
      return formatMonthlyCost(min, max);
    }
  },
  {
    key: "nurse_24h",
    label: "پرستار شبانه‌روزی",
    resolve: (result, items) =>
      formatYesNo(
        resolveField(
          result,
          items,
          [
            "حضور پرستار شبانه‌روزی",
            "پرستار شبانه‌روزی",
            "پرستار شبانه روزی",
            "nurse_24h"
          ],
          ["nurse_24h", "night_nurse", "nurse24h", "has_night_nurse"]
        )
      )
  },
  {
    key: "hospital_distance",
    label: "فاصله بیمارستان",
    resolve: (result, items) => {
      const unit = resolveField(
        result,
        items,
        ["واحد فاصله بیمارستان", "hospital_distance_unit"],
        ["hospital_distance_unit", "hospitalDistanceUnit"]
      );
      const distance = resolveField(
        result,
        items,
        [
          "نزدیکی به بیمارستان",
          "فاصله تا بیمارستان",
          "فاصله بیمارستان",
          "hospital_distance"
        ],
        [
          "hospital_distance",
          "hospitalDistance",
          "distance_to_hospital",
          "distance_to_hospital_km"
        ]
      );
      if (!distance) return "";
      if (unit) {
        const n = normalizeText(unit);
        if (n.includes("کیلومتر") || n === "km") return `${distance} کیلومتر`;
        if (n.includes("متر") || n === "m") return `${distance} متر`;
        return `${distance} ${unit}`;
      }
      return formatDistance(distance);
    }
  },
  {
    key: "doctor_type",
    label: "نوع پزشک",
    labels: ["نوع پزشک", "پزشک", "doctor_type", "doctor type"],
    directKeys: ["doctor_type", "doctorType", "physician_type"]
  },
  {
    key: "caregiver_type",
    label: "نوع مراقب یا پرستار",
    labels: [
      "نوع مراقب یا پرستار",
      "نوع مراقب",
      "نوع پرستار",
      "caregiver_type"
    ],
    directKeys: ["caregiver_type", "caregiverType", "nurse_type"]
  },
  {
    key: "room_types",
    label: "نوع اتاق‌ها",
    labels: ["نوع اتاق‌ها", "نوع اتاق", "اتاق‌ها", "room_types", "room type"],
    directKeys: ["room_types", "roomTypes", "room_type"]
  },
  {
    key: "dispatch_workforce_types",
    label: "نوع نیروی قابل اعزام",
    labels: [
      "نوع نیروی قابل اعزام",
      "نیروی قابل اعزام",
      "dispatch_workforce_types",
      "dispatch workforce"
    ],
    directKeys: [
      "dispatch_workforce_types",
      "dispatchWorkforceTypes",
      "dispatch_workforce"
    ]
  },
  {
    key: "license_type",
    label: "نوع مجوز مرکز",
    labels: [
      "نوع مجوز مرکز چیست؟",
      "نوع مجوز مرکز",
      "نوع مجوز",
      "license_type"
    ],
    directKeys: ["license_type", "licenseType", "center_license_type"]
  }
];

/** Elderly-only glance keys hidden on nursing / both public profiles. */
const ELDERLY_ONLY_GLANCE_KEYS = new Set([
  "hospital_distance",
  "doctor_type",
  "caregiver_type",
  "room_types"
]);

/** Nursing / both glance keys hidden on elderly-only public profiles. */
const NURSING_ONLY_GLANCE_KEYS = new Set([
  "dispatch_workforce_types",
  "license_type"
]);

export const CARE_TREATMENT_DEFS: {
  id: string;
  label: string;
  detail?: string;
  keywords: string[];
  valueLabels?: string[];
  directKeys?: string[];
}[] = [
  {
    id: "caregiver_aide_24h",
    label: "حضور مراقب یا کمک‌بهیار",
    detail: "به‌صورت شبانه‌روزی",
    keywords: [
      "مراقب یا کمک",
      "کمک‌بهیار",
      "کمک بهیار",
      "مراقب شبانه",
      "حضور مراقب"
    ]
  },
  {
    id: "private_caregiver",
    label: "امکان مراقب اختصاصی",
    keywords: ["مراقب اختصاصی", "پرستار اختصاصی", "مراقب خصوصی"]
  },
  {
    id: "nutritionist",
    label: "متخصص تغذیه",
    keywords: ["تغذیه", "nutrition"]
  },
  {
    id: "hospital_collab",
    label: "همکاری با بیمارستان",
    keywords: ["همکاری با بیمارستان", "ارتباط با بیمارستان", "قرارداد بیمارستان"]
  },
  {
    id: "psychologist",
    label: "روانشناس",
    keywords: ["روانشناس", "روان‌شناس", "psycholog"]
  },
  {
    id: "psychiatrist",
    label: "روانپزشک",
    keywords: ["روانپزشک", "روان‌پزشک", "psychiatr"]
  },
  {
    id: "geriatrician",
    label: "پزشک طب سالمندی",
    keywords: ["طب سالمندی", "سالمندی", "geriatr"]
  },
  {
    id: "physiotherapist",
    label: "فیزیوتراپیست",
    keywords: ["فیزیوتراپ", "فیزیو", "physio"]
  },
  {
    id: "occupational_therapist",
    label: "کاردرمانگر",
    keywords: ["کاردرمان", "کار درمان", "occupational"]
  },
  {
    id: "social_worker",
    label: "مددکار اجتماعی",
    keywords: ["مددکار", "اجتماعی", "social worker"]
  },
  {
    id: "dentist",
    label: "دندانپزشک",
    keywords: ["دندانپزشک", "دندان", "dental"]
  },
  {
    id: "speech_therapist",
    label: "گفتاردرمانگر",
    keywords: ["گفتاردرمان", "گفتار درمان", "speech"]
  },
  {
    id: "medication_management",
    label: "مدیریت دارو",
    keywords: ["مدیریت دارو", "دارو", "medication"]
  },
  {
    id: "doctor",
    label: "پزشک",
    keywords: ["پزشک", "doctor", "ویزیت پزشک"],
    valueLabels: ["نوع پزشک", "پزشک"],
    directKeys: ["doctor_type", "doctorType", "physician_type"]
  }
];

export function getCenterMetaItems(result?: CenterResult): ProfileFieldItem[] {
  const items = collectLabeledItems(result);
  const nursing = isNursingGlanceProfile(result?.care_domain);
  return META_DEFS.map(def => {
    if (nursing && ELDERLY_ONLY_META_KEYS.has(def.key)) return null;
    if (!nursing && NURSING_ONLY_META_KEYS.has(def.key)) return null;
    const raw = def.resolve
      ? def.resolve(result, items)
      : resolveField(result, items, def.labels || [], def.directKeys || []);
    const value = localizeResolvedFact(def.key, raw);
    if (!value) return null;
    return { key: def.key, label: def.label, value };
  }).filter((item): item is ProfileFieldItem => Boolean(item));
}

export function getCenterGlanceItems(result?: CenterResult): ProfileFieldItem[] {
  const items = collectLabeledItems(result);
  const nursing = isNursingGlanceProfile(result?.care_domain);
  return GLANCE_DEFS.map(def => {
    if (nursing && ELDERLY_ONLY_GLANCE_KEYS.has(def.key)) return null;
    if (!nursing && NURSING_ONLY_GLANCE_KEYS.has(def.key)) return null;
    const raw = def.resolve
      ? def.resolve(result, items)
      : resolveField(result, items, def.labels || [], def.directKeys || []);
    const value = localizeResolvedFact(def.key, raw);
    if (!value) return null;
    return { key: def.key, label: def.label, value };
  }).filter((item): item is ProfileFieldItem => Boolean(item));
}

function collectSearchCorpus(result?: CenterResult) {
  const labeled = collectLabeledItems(result);
  const amenities = getAmenityItems(result);
  const services = (result?.services || []) as CenterServiceItem[];

  const rows: { text: string; value?: string }[] = [
    ...labeled.map(item => ({
      text: `${item.label} ${item.value}`,
      value: item.value
    })),
    ...amenities.map((item: CenterAmenityItem) => ({
      text: `${item.name || ""} ${item.slug || ""} ${item.description || ""}`,
      value: item.description || item.name
    })),
    ...services.map(item => ({
      text: `${item.name || ""} ${item.description || ""}`,
      value: item.description || item.name
    }))
  ];

  return rows;
}

function normalizeStructuredItems(
  raw?: KeyInfoRawItem[] | KeyInfoItem[] | null
): { id: string; label: string; value: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const label = String(
        row.label || row.name || row.title || row.tag_name || ""
      ).trim();
      const value = String(
        row.value || row.description || row.body || row.detail || ""
      ).trim();
      const id = String(row.key || row.id || label || index);
      if (!label && !value) return null;
      return { id, label: label || value, value: label ? value : "" };
    })
    .filter((item): item is { id: string; label: string; value: string } =>
      Boolean(item)
    );
}

function asTruthyFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const n = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "بله", "آری"].includes(n);
}

/**
 * The «مراقبت و درمان» section is split into three blocks: always-on
 * facilities, selectable services with a visit cadence, and the doctor entry
 * which also carries its kind (general / specialist).
 */
export type CareTreatmentGroups = {
  facilities: CareTreatmentItem[];
  services: CareTreatmentItem[];
  doctor: CareTreatmentItem | null;
};

const FACILITY_ORDER = new Map(
  CARE_FACILITY_SLUGS.map((slug, index) => [slug as string, index])
);

const SERVICE_ORDER = new Map(
  SPECIALIST_TYPES.map((option, index) => [option.value as string, index])
);

function activeSpecialists(result: CenterResult) {
  if (!Array.isArray(result.specialists)) return [];
  return result.specialists.filter(row => {
    if (!String(row.specialist_type || "").trim()) return false;
    if (row.is_active == null) return true;
    return asTruthyFlag(row.is_active);
  });
}

export function getCareTreatmentGroups(
  result?: CenterResult
): CareTreatmentGroups {
  if (!result) return { facilities: [], services: [], doctor: null };

  const facilities = (
    Array.isArray(result.care_items) ? result.care_items : []
  )
    .filter(item => asTruthyFlag(item.has_it) && String(item.name || "").trim())
    .map(item => {
      const slug = String(item.slug || item.id || item.name);
      return {
        id: slug,
        label: String(item.name).trim(),
        detail: item.note ? String(item.note).trim() : undefined,
        available: true,
        keywords: [String(item.name)],
        sortKey: FACILITY_ORDER.get(slug) ?? Number(item.sort_order ?? 999)
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...item }) => item);

  const specialists = activeSpecialists(result);

  const services = specialists
    .filter(row => String(row.specialist_type).trim() !== DOCTOR_TYPE)
    .map(row => {
      const type = String(row.specialist_type).trim();
      return {
        id: type,
        label: specialistLabel(type),
        detail: careScheduleDetail(row) ?? undefined,
        available: true,
        keywords: [type, specialistLabel(type)],
        sortKey: SERVICE_ORDER.get(type) ?? 999
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...item }) => item);

  const doctorRow = specialists.find(
    row => String(row.specialist_type).trim() === DOCTOR_TYPE
  );
  const doctor: CareTreatmentItem | null = doctorRow
    ? {
        id: DOCTOR_TYPE,
        label: DOCTOR_LABEL,
        detail:
          [doctorKindLabel(doctorRow.doctor_kind), careScheduleDetail(doctorRow)]
            .filter(Boolean)
            .join(" — ") || undefined,
        available: true,
        keywords: [DOCTOR_TYPE, DOCTOR_LABEL]
      }
    : null;

  return { facilities, services, doctor };
}

export function getCareTreatmentItems(
  result?: CenterResult
): CareTreatmentItem[] {
  const { facilities, services, doctor } = getCareTreatmentGroups(result);
  return [...facilities, ...services, ...(doctor ? [doctor] : [])];
}

export type DailyLifeDisplayItem = {
  id: string;
  label: string;
  value?: string;
  available: boolean;
};

export function getDailyLifeItems(
  result?: CenterResult
): DailyLifeDisplayItem[] {
  if (!result) return [];

  const items: DailyLifeDisplayItem[] = [];
  const schedule = result.daily_schedule;

  if (schedule) {
    if (schedule.wake_time) {
      items.push({
        id: "wake_time",
        label: "ساعت بیدار شدن",
        value: String(schedule.wake_time),
        available: true
      });
    }
    if (schedule.sleep_time) {
      items.push({
        id: "sleep_time",
        label: "ساعت خواب",
        value: String(schedule.sleep_time),
        available: true
      });
    }
    if (schedule.daily_routine_desc) {
      items.push({
        id: "daily_routine_desc",
        label: "برنامه روزانه",
        value: String(schedule.daily_routine_desc),
        available: true
      });
    }
    if (schedule.weekly_schedule_sample) {
      items.push({
        id: "weekly_schedule_sample",
        label: "نمونه برنامه هفتگی",
        value: String(schedule.weekly_schedule_sample),
        available: true
      });
    }
    if (asTruthyFlag(schedule.allows_family_participation)) {
      items.push({
        id: "allows_family_participation",
        label: "مشارکت خانواده",
        available: true
      });
    }
    if (asTruthyFlag(schedule.has_special_needs_program)) {
      items.push({
        id: "has_special_needs_program",
        label: "برنامه ویژه سالمندان کم‌توان",
        available: true
      });
    }
  }

  const activities = Array.isArray(result.activities) ? result.activities : [];
  for (const activity of activities) {
    const name = String(activity.name || "").trim();
    if (!name) continue;
    items.push({
      id: String(activity.slug || activity.id || name),
      label: name,
      value: activity.note ? String(activity.note).trim() : undefined,
      available: true
    });
  }

  return items;
}

export function getFamilyVisitItems(result?: CenterResult): ProfileFieldItem[] {
  if (!result) return [];

  const policy = result.visit_policy;
  if (!policy) return [];

  const items: ProfileFieldItem[] = [];

  const visitBits = [policy.visit_days, policy.visit_hours]
    .map(v => (v != null ? String(v).trim() : ""))
    .filter(Boolean);
  if (visitBits.length) {
    items.push({
      key: "in_person_visit",
      label: "ملاقات حضوری",
      value: visitBits.join(" — ")
    });
  }

  if (asTruthyFlag(policy.allows_video_contact)) {
    items.push({
      key: "video_call",
      label: "تماس تصویری",
      value: policy.contact_hours
        ? String(policy.contact_hours).trim()
        : "فعال"
    });
  }

  if (asTruthyFlag(policy.allows_phone_contact)) {
    items.push({
      key: "phone_contact",
      label: "تماس تلفنی",
      value: policy.contact_hours
        ? String(policy.contact_hours).trim()
        : "فعال"
    });
  }

  if (asTruthyFlag(policy.needs_prior_coordination)) {
    items.push({
      key: "needs_prior_coordination",
      label: "نیاز به هماهنگی قبلی",
      value: "بله"
    });
  }

  if (asTruthyFlag(policy.allows_private_visit)) {
    items.push({
      key: "allows_private_visit",
      label: "ملاقات خصوصی",
      value: "فعال"
    });
  }

  if (asTruthyFlag(policy.allows_open_space_visit)) {
    items.push({
      key: "allows_open_space_visit",
      label: "ملاقات در فضای باز",
      value: "فعال"
    });
  }

  if (policy.max_visitors_count != null && String(policy.max_visitors_count).trim()) {
    items.push({
      key: "max_visitors_count",
      label: "حداکثر تعداد ملاقات‌کننده",
      value: String(policy.max_visitors_count)
    });
  }

  if (asTruthyFlag(policy.allows_temporary_leave)) {
    items.push({
      key: "allows_temporary_leave",
      label: "مرخصی موقت",
      value: policy.temporary_leave_conditions
        ? String(policy.temporary_leave_conditions).trim()
        : "فعال"
    });
  }

  if (asTruthyFlag(policy.allows_overnight_leave)) {
    items.push({
      key: "allows_overnight_leave",
      label: "مرخصی شبانه",
      value: "فعال"
    });
  }

  const reportBits = [
    policy.status_report_method,
    policy.status_report_frequency
  ]
    .map(v => (v != null ? String(v).trim() : ""))
    .filter(Boolean);
  if (reportBits.length) {
    items.push({
      key: "status_report",
      label: "گزارش وضعیت",
      value: reportBits.join(" — ")
    });
  }

  if (policy.contact_person_role) {
    items.push({
      key: "contact_person_role",
      label: "نقش رابط ارتباط",
      value: String(policy.contact_person_role).trim()
    });
  }

  if (asTruthyFlag(policy.allows_direct_staff_contact)) {
    items.push({
      key: "allows_direct_staff_contact",
      label: "ارتباط مستقیم با پرسنل",
      value: "فعال"
    });
  }

  if (policy.complaint_method || policy.complaint_response_time) {
    items.push({
      key: "complaint",
      label: "ثبت شکایت",
      value: [policy.complaint_method, policy.complaint_response_time]
        .map(v => (v != null ? String(v).trim() : ""))
        .filter(Boolean)
        .join(" — ")
    });
  }

  return items;
}

/** @deprecated Presets kept for Panel catalog / seed only */
export const DAILY_LIFE_DEFS: {
  id: string;
  label: string;
  keywords: string[];
}[] = [
  {
    id: "daily_schedule",
    label: "برنامه روزانه منظم",
    keywords: ["برنامه روزانه", "روزانه منظم", "daily schedule"]
  },
  {
    id: "light_exercise",
    label: "ورزش و حرکات سبک",
    keywords: ["ورزش", "حرکات سبک", "نرمش", "exercise"]
  },
  {
    id: "social_programs",
    label: "برنامه‌های اجتماعی",
    keywords: ["برنامه اجتماعی", "برنامه‌های اجتماعی", "social"]
  },
  {
    id: "creative_workshops",
    label: "کارگاه‌ها و فعالیت‌های خلاق",
    keywords: ["کارگاه", "فعالیت خلاق", "خلاق", "workshop"]
  }
];

/** @deprecated Presets kept for reference / icons only */
export const FAMILY_VISIT_DEFS: {
  id: string;
  label: string;
  labels: string[];
  directKeys: string[];
  keywords: string[];
}[] = [
  {
    id: "in_person_visit",
    label: "ملاقات حضوری",
    labels: ["ملاقات حضوری", "ساعت ملاقات", "ساعات ملاقات"],
    directKeys: ["visit_hours", "visiting_hours", "in_person_visit"],
    keywords: ["ملاقات حضوری", "ساعات ملاقات"]
  },
  {
    id: "video_call",
    label: "تماس تصویری روزانه",
    labels: ["تماس تصویری روزانه", "تماس تصویری", "ویدیو کال"],
    directKeys: ["video_call", "daily_video_call", "videoCall"],
    keywords: ["تماس تصویری", "ویدیو"]
  },
  {
    id: "communication_terms",
    label: "شرایط ارتباطی",
    labels: ["شرایط ارتباطی", "شرایط تماس", "ارتباط با خانواده"],
    directKeys: ["communication_terms", "family_communication"],
    keywords: ["شرایط ارتباطی", "ارتباط با خانواده"]
  }
];

