/**
 * Canonical English DB values ↔ Persian UI labels for centers ENUM/SET columns.
 *
 * DB stores English only. Admin forms and public pages show Persian.
 * Legacy Persian DB values are accepted as aliases on read until migration finishes.
 */

export type CenterEnumField =
  | "center_type"
  | "care_domain"
  | "admission_gender"
  | "doctor_type"
  | "caregiver_type"
  | "room_types"
  | "dispatch_workforce_types"
  | "license_type"
  | "min_work_experience_unit"
  | "dispatch_tehran_districts"
  | "dispatch_lead_time"
  | "urgent_dispatch"
  | "activity_days";

function toFaDigits(raw: string | number): string {
  return String(raw).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}

type LocaleEntry = {
  /** English value stored in MySQL ENUM/SET */
  db: string;
  /** Primary Persian label shown in UI */
  fa: string;
  /** Extra tokens that should resolve to this db value (legacy FA, variants, EN synonyms) */
  aliases?: string[];
};

/**
 * When the center operates: daytime only, round the clock, or both.
 * This is the axis the centers list filter uses.
 */
const CENTER_TYPE_ENTRIES: LocaleEntry[] = [
  {
    db: "residential",
    fa: "شبانه‌روزی",
    aliases: ["شبانه روزی", "شبانه", "overnight", "boarding"]
  },
  {
    db: "day_care",
    fa: "روزانه",
    aliases: ["روزانه", "daycare", "day-care"]
  },
  {
    db: "comprehensive",
    // Renamed from «جامع»: the option means the center runs both shifts.
    fa: "هر دو",
    aliases: ["جامع", "هردو", "comprehensive_center", "both"]
  }
];

/**
 * What kind of care the center provides. Independent of the day/night axis —
 * a center can be «پرستاری» and «شبانه‌روزی» at the same time.
 */
const CARE_DOMAIN_ENTRIES: LocaleEntry[] = [
  {
    db: "elderly",
    fa: "سالمندان",
    aliases: ["سالمند", "مراقبت از سالمندان", "elder", "elderly_care"]
  },
  {
    db: "nursing",
    fa: "پرستاری",
    aliases: ["پرستاري", "خدمات پرستاری", "nurse", "nursing_care"]
  },
  {
    db: "both",
    fa: "هر دو",
    aliases: ["هردو", "both_services", "elderly_and_nursing"]
  }
];

const ADMISSION_GENDER_ENTRIES: LocaleEntry[] = [
  {
    db: "women",
    fa: "فقط خانم‌ها",
    aliases: ["خانم‌ها", "خانمها", "female", "females"]
  },
  {
    db: "men",
    fa: "فقط آقایان",
    aliases: ["آقایان", "اقايان", "male", "males"]
  },
  {
    db: "both_separate",
    fa: "خانم‌ها و آقایان در بخش‌های مجزا",
    aliases: [
      "هردو در بخش مجزا",
      "هر دو در بخش مجزا",
      "both",
      "mixed_separate"
    ]
  }
];

const DOCTOR_TYPE_ENTRIES: LocaleEntry[] = [
  { db: "general", fa: "عمومی", aliases: ["gp"] },
  { db: "specialist", fa: "متخصص", aliases: ["specialists"] },
  { db: "comprehensive", fa: "متخصص و عمومی", aliases: ["full"] }
];

const CAREGIVER_TYPE_ENTRIES: LocaleEntry[] = [
  {
    db: "nurse",
    fa: "پرستار متخصص",
    aliases: ["پرستار", "nurses"]
  },
  {
    db: "caregiver",
    fa: "مراقب",
    aliases: ["مراقبین", "aide", "aides"]
  }
];

const ROOM_TYPE_ENTRIES: LocaleEntry[] = [
  {
    db: "independent",
    fa: "مستقل",
    aliases: ["تک نفره", "single"]
  },
  {
    db: "double",
    fa: "۲ تخته",
    aliases: ["2 تخته", "دو تخته", "دوتخته"]
  },
  {
    db: "multi",
    fa: "چند تخته",
    aliases: ["چندتخته", "shared", "multiple"]
  }
];

/**
 * Dispatchable workforce types for nursing centers (multi-select).
 * Experience options are leaves under «پرستار دارای تجربه مراقبت از».
 * The first two entries are top-level; everything after is an experience leaf
 * (see DISPATCH_WORKFORCE_TOP_FA_OPTIONS / DISPATCH_EXPERIENCE_DB).
 */
const DISPATCH_WORKFORCE_ENTRIES: LocaleEntry[] = [
  {
    db: "companion",
    fa: "مراقب یا همراه",
    aliases: ["مراقب", "همراه", "caregiver_companion", "aide"]
  },
  {
    db: "specialist_nurse",
    fa: "پرستار متخصص یا دارای مدرک دانشگاهی",
    aliases: ["پرستار متخصص", "مدرک دانشگاهی", "university_nurse"]
  },
  {
    db: "exp_alzheimers",
    fa: "آلزایمر و دمانس",
    aliases: ["آلزایمر", "دمانس", "alzheimers", "dementia"]
  },
  {
    db: "exp_stroke",
    fa: "بیمار سکته",
    aliases: ["سکته", "stroke"]
  },
  {
    db: "exp_cancer",
    fa: "بیمار سرطانی",
    aliases: ["سرطان", "cancer"]
  },
  {
    db: "exp_respiratory",
    fa: "بیمار تنفسی",
    aliases: ["تنفسی", "respiratory"]
  },
  {
    db: "exp_incontinence",
    fa: "پوشکی",
    aliases: [
      "بیمار پوشکی",
      "پوشک",
      "نیازمند پوشک",
      "بی‌اختیاری",
      "incontinence",
      "diaper"
    ]
  },
  {
    db: "exp_parkinsons",
    fa: "پارکینسون",
    aliases: ["بیمار پارکینسون", "پارکینسونی", "parkinsons", "parkinson"]
  },
  {
    db: "exp_pelvic",
    fa: "لگنی",
    aliases: ["بیمار لگنی", "شکستگی لگن", "pelvic"]
  },
  {
    db: "exp_mobility",
    fa: "ویلچری یا نیاز به کمک در جابجایی",
    aliases: [
      "ویلچری",
      "ویلچر",
      "کمک در جابجایی",
      "جابجایی",
      "wheelchair",
      "mobility"
    ]
  }
];

const LICENSE_TYPE_ENTRIES: LocaleEntry[] = [
  {
    db: "health_ministry_or_university",
    fa: "دارای مجوز وزارت بهداشت یا دانشگاه علوم پزشکی",
    aliases: ["مجوز وزارت بهداشت", "دانشگاه علوم پزشکی", "ministry_of_health"]
  },
  {
    db: "welfare_organization",
    fa: "دارای مجوز سازمان بهزیستی",
    aliases: ["مجوز بهزیستی", "سازمان بهزیستی", "welfare"]
  },
  {
    db: "other_authority",
    fa: "دارای مجوز از سایر مراجع قانونی",
    aliases: ["سایر مراجع", "مجوز سایر مراجع", "other_legal_authority"]
  },
  {
    db: "registered_without_specialized_license",
    fa: "دارای ثبت شرکت یا مؤسسه، بدون مجوز تخصصی",
    aliases: ["ثبت شرکت", "بدون مجوز تخصصی", "registered_no_license"]
  },
  {
    db: "license_in_progress",
    fa: "مجوز در حال صدور یا تمدید",
    aliases: ["در حال صدور", "در حال تمدید", "pending_license"]
  },
  {
    db: "other",
    fa: "سایر",
    aliases: ["other"]
  }
];

/** Unit for minimum work experience on nursing overview. */
const MIN_WORK_EXPERIENCE_UNIT_ENTRIES: LocaleEntry[] = [
  { db: "years", fa: "سال", aliases: ["year", "yrs"] },
  { db: "months", fa: "ماه", aliases: ["month", "mos"] }
];

/** Tehran dispatch coverage: citywide, Karaj, districts 1–22. */
const DISPATCH_TEHRAN_DISTRICT_ENTRIES: LocaleEntry[] = [
  {
    db: "all_tehran",
    fa: "سراسر تهران",
    aliases: ["تمام تهران", "همه تهران", "کل تهران", "all"]
  },
  {
    db: "karaj",
    fa: "کرج",
    aliases: ["کرج ", "karaj", "کرجستان"]
  },
  ...Array.from({ length: 22 }, (_, index) => {
    const n = index + 1;
    return {
      db: `d${n}`,
      fa: `منطقه ${toFaDigits(n)}`,
      aliases: [`منطقه ${n}`, `district_${n}`, `region_${n}`, String(n)]
    };
  })
];

const DISPATCH_LEAD_TIME_ENTRIES: LocaleEntry[] = [
  {
    db: "under_2h",
    fa: "کمتر از ۲ ساعت",
    aliases: ["کمتر از 2 ساعت", "under_2_hours", "<2h"]
  },
  {
    db: "2_to_4h",
    fa: "۲ تا ۴ ساعت",
    aliases: ["2 تا 4 ساعت", "2_to_4_hours"]
  },
  {
    db: "same_day",
    fa: "همان روز",
    aliases: ["same day", "امروز"]
  },
  {
    db: "next_day",
    fa: "روز بعد",
    aliases: ["next day", "فردا"]
  },
  {
    db: "2_to_3_days",
    fa: "از ۲ تا ۳ روز قبل",
    aliases: [
      "از 2 تا 3 روز قبل",
      "۲-۳ روز قبل",
      "2-3 روز قبل",
      "2 تا 3 روز",
      "2_to_3_days_ahead"
    ]
  }
];

const URGENT_DISPATCH_ENTRIES: LocaleEntry[] = [
  {
    db: "yes_24h",
    fa: "بله، شبانه‌روزی",
    aliases: ["بله شبانه روزی", "بله شبانه‌روزی", "yes_24", "24h"]
  },
  {
    db: "daytime_only",
    fa: "فقط روزها",
    aliases: ["فقط روز", "daytime", "days_only"]
  },
  {
    db: "no",
    fa: "خیر",
    aliases: ["ندارد", "false"]
  }
];

/** Persian week order (Saturday → Friday), matching panel EMPTY_CENTER_WEEK. */
const ACTIVITY_DAY_ENTRIES: LocaleEntry[] = [
  { db: "sat", fa: "شنبه", aliases: ["saturday", "sat"] },
  { db: "sun", fa: "یکشنبه", aliases: ["sunday", "sun"] },
  { db: "mon", fa: "دوشنبه", aliases: ["monday", "mon"] },
  { db: "tue", fa: "سه‌شنبه", aliases: ["سه شنبه", "tuesday", "tue"] },
  { db: "wed", fa: "چهارشنبه", aliases: ["wednesday", "wed"] },
  { db: "thu", fa: "پنج‌شنبه", aliases: ["پنج شنبه", "thursday", "thu"] },
  { db: "fri", fa: "جمعه", aliases: ["friday", "fri"] }
];

const FIELD_ENTRIES: Record<CenterEnumField, LocaleEntry[]> = {
  center_type: CENTER_TYPE_ENTRIES,
  care_domain: CARE_DOMAIN_ENTRIES,
  admission_gender: ADMISSION_GENDER_ENTRIES,
  doctor_type: DOCTOR_TYPE_ENTRIES,
  caregiver_type: CAREGIVER_TYPE_ENTRIES,
  room_types: ROOM_TYPE_ENTRIES,
  dispatch_workforce_types: DISPATCH_WORKFORCE_ENTRIES,
  license_type: LICENSE_TYPE_ENTRIES,
  min_work_experience_unit: MIN_WORK_EXPERIENCE_UNIT_ENTRIES,
  dispatch_tehran_districts: DISPATCH_TEHRAN_DISTRICT_ENTRIES,
  dispatch_lead_time: DISPATCH_LEAD_TIME_ENTRIES,
  urgent_dispatch: URGENT_DISPATCH_ENTRIES,
  activity_days: ACTIVITY_DAY_ENTRIES
};

/** Persian option labels for admin selects (UI only). */
export const CENTER_TYPE_FA_OPTIONS = CENTER_TYPE_ENTRIES.map(e => e.fa);
export const CARE_DOMAIN_FA_OPTIONS = CARE_DOMAIN_ENTRIES.map(e => e.fa);
export const ADMISSION_GENDER_FA_OPTIONS = ADMISSION_GENDER_ENTRIES.map(
  e => e.fa
);
export const DOCTOR_TYPE_FA_OPTIONS = DOCTOR_TYPE_ENTRIES.map(e => e.fa);
export const CAREGIVER_TYPE_FA_OPTIONS = CAREGIVER_TYPE_ENTRIES.map(e => e.fa);
export const ROOM_TYPE_FA_OPTIONS = ROOM_TYPE_ENTRIES.map(e => e.fa);
export const DISPATCH_WORKFORCE_FA_OPTIONS = DISPATCH_WORKFORCE_ENTRIES.map(
  e => e.fa
);
/** Top-level dispatch options (not experience leaves). */
export const DISPATCH_WORKFORCE_TOP_FA_OPTIONS = DISPATCH_WORKFORCE_FA_OPTIONS.slice(
  0,
  2
) as readonly string[];
/** Experience leaves under «پرستار دارای تجربه مراقبت از». */
export const DISPATCH_WORKFORCE_EXPERIENCE_FA_OPTIONS =
  DISPATCH_WORKFORCE_FA_OPTIONS.slice(2) as readonly string[];
export const LICENSE_TYPE_FA_OPTIONS = LICENSE_TYPE_ENTRIES.map(e => e.fa);
export const MIN_WORK_EXPERIENCE_UNIT_FA_OPTIONS =
  MIN_WORK_EXPERIENCE_UNIT_ENTRIES.map(e => e.fa);
export const DISPATCH_TEHRAN_DISTRICT_FA_OPTIONS =
  DISPATCH_TEHRAN_DISTRICT_ENTRIES.map(e => e.fa);
export const DISPATCH_LEAD_TIME_FA_OPTIONS = DISPATCH_LEAD_TIME_ENTRIES.map(
  e => e.fa
);
export const URGENT_DISPATCH_FA_OPTIONS = URGENT_DISPATCH_ENTRIES.map(e => e.fa);
export const ACTIVITY_DAY_FA_OPTIONS = ACTIVITY_DAY_ENTRIES.map(e => e.fa);

/** English values allowed in MySQL. */
export const CENTER_TYPE_DB_VALUES = CENTER_TYPE_ENTRIES.map(e => e.db);
export const CARE_DOMAIN_DB_VALUES = CARE_DOMAIN_ENTRIES.map(e => e.db);
export const ADMISSION_GENDER_DB_VALUES = ADMISSION_GENDER_ENTRIES.map(
  e => e.db
);
export const DOCTOR_TYPE_DB_VALUES = DOCTOR_TYPE_ENTRIES.map(e => e.db);
export const CAREGIVER_TYPE_DB_VALUES = CAREGIVER_TYPE_ENTRIES.map(e => e.db);
export const ROOM_TYPE_DB_VALUES = ROOM_TYPE_ENTRIES.map(e => e.db);
export const DISPATCH_WORKFORCE_DB_VALUES = DISPATCH_WORKFORCE_ENTRIES.map(
  e => e.db
);
export const LICENSE_TYPE_DB_VALUES = LICENSE_TYPE_ENTRIES.map(e => e.db);
export const MIN_WORK_EXPERIENCE_UNIT_DB_VALUES =
  MIN_WORK_EXPERIENCE_UNIT_ENTRIES.map(e => e.db);
export const DISPATCH_TEHRAN_DISTRICT_DB_VALUES =
  DISPATCH_TEHRAN_DISTRICT_ENTRIES.map(e => e.db);
export const DISPATCH_LEAD_TIME_DB_VALUES = DISPATCH_LEAD_TIME_ENTRIES.map(
  e => e.db
);
export const URGENT_DISPATCH_DB_VALUES = URGENT_DISPATCH_ENTRIES.map(e => e.db);
export const ACTIVITY_DAY_DB_VALUES = ACTIVITY_DAY_ENTRIES.map(e => e.db);

/** Experience option db codes (for readable multi-value formatting). */
const DISPATCH_EXPERIENCE_DB = new Set([
  "exp_alzheimers",
  "exp_stroke",
  "exp_cancer",
  "exp_respiratory",
  "exp_incontinence",
  "exp_parkinsons",
  "exp_pelvic",
  "exp_mobility"
]);

/**
 * Nursing centers (پرستاری) and hybrid centers (هر دو) use the nursing
 * glance profile: dispatch workforce + license type; hide elderly-only fields.
 */
export function isNursingGlanceProfile(careDomain: unknown): boolean {
  const db = toDbEnumValue("care_domain", careDomain);
  return db === "nursing" || db === "both";
}

/** Pure nursing centers (not hybrid «هر دو») — no residential working-hours UI. */
export function isPureNursingCenter(careDomain: unknown): boolean {
  return toDbEnumValue("care_domain", careDomain) === "nursing";
}

/**
 * Readable FA string for selected dispatch workforce options.
 * Groups experience leaves under «پرستار دارای تجربه مراقبت از: …».
 */
export function formatDispatchWorkforceDisplay(raw: unknown): string {
  const parts = splitMulti(raw)
    .map(part => {
      const entry = resolveEntry("dispatch_workforce_types", part);
      return entry || null;
    })
    .filter((e): e is LocaleEntry => Boolean(e));

  if (!parts.length) return "";

  const seen = new Set<string>();
  const top: string[] = [];
  const experience: string[] = [];
  for (const entry of parts) {
    if (seen.has(entry.db)) continue;
    seen.add(entry.db);
    if (DISPATCH_EXPERIENCE_DB.has(entry.db)) experience.push(entry.fa);
    else top.push(entry.fa);
  }

  const chunks = [...top];
  if (experience.length) {
    chunks.push(`پرستار دارای تجربه مراقبت از: ${experience.join("، ")}`);
  }
  return chunks.join(" / ");
}

export function normalizeEnumToken(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/\u200c/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildLookup(entries: LocaleEntry[]) {
  const map = new Map<string, LocaleEntry>();
  for (const entry of entries) {
    map.set(normalizeEnumToken(entry.db), entry);
    map.set(normalizeEnumToken(entry.fa), entry);
    for (const alias of entry.aliases || []) {
      map.set(normalizeEnumToken(alias), entry);
    }
  }
  return map;
}

const LOOKUPS: Record<CenterEnumField, Map<string, LocaleEntry>> = {
  center_type: buildLookup(CENTER_TYPE_ENTRIES),
  care_domain: buildLookup(CARE_DOMAIN_ENTRIES),
  admission_gender: buildLookup(ADMISSION_GENDER_ENTRIES),
  doctor_type: buildLookup(DOCTOR_TYPE_ENTRIES),
  caregiver_type: buildLookup(CAREGIVER_TYPE_ENTRIES),
  room_types: buildLookup(ROOM_TYPE_ENTRIES),
  dispatch_workforce_types: buildLookup(DISPATCH_WORKFORCE_ENTRIES),
  license_type: buildLookup(LICENSE_TYPE_ENTRIES),
  min_work_experience_unit: buildLookup(MIN_WORK_EXPERIENCE_UNIT_ENTRIES),
  dispatch_tehran_districts: buildLookup(DISPATCH_TEHRAN_DISTRICT_ENTRIES),
  dispatch_lead_time: buildLookup(DISPATCH_LEAD_TIME_ENTRIES),
  urgent_dispatch: buildLookup(URGENT_DISPATCH_ENTRIES),
  activity_days: buildLookup(ACTIVITY_DAY_ENTRIES)
};

function splitMulti(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(v => String(v).trim()).filter(Boolean);
  }
  return String(raw ?? "")
    .split(/[\/،,|]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function resolveEntry(
  field: CenterEnumField,
  token: string
): LocaleEntry | undefined {
  if (!token) return undefined;
  return LOOKUPS[field].get(normalizeEnumToken(token));
}

/** Map a single UI/legacy token → English DB value (or null if unknown). */
export function toDbEnumValue(
  field: CenterEnumField,
  raw: unknown
): string | null {
  const entry = resolveEntry(field, String(raw ?? "").trim());
  return entry ? entry.db : null;
}

/** Map English/legacy token → Persian label for display. Unknown → original trimmed. */
export function toFaEnumValue(field: CenterEnumField, raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const entry = resolveEntry(field, text);
  return entry ? entry.fa : text;
}

/**
 * Encode multi-value SET fields for MySQL (comma-separated English, no spaces).
 * Accepts Persian labels, English codes, or mixed.
 */
export function toDbSetValue(field: CenterEnumField, raw: unknown): string {
  const dbValues: string[] = [];
  const seen = new Set<string>();
  for (const part of splitMulti(raw)) {
    const db = toDbEnumValue(field, part);
    if (db && !seen.has(db)) {
      seen.add(db);
      dbValues.push(db);
    }
  }
  return dbValues.join(",");
}

/** Decode SET/ENUM (or joined string) → Persian labels joined with " / ". */
export function toFaSetValue(field: CenterEnumField, raw: unknown): string {
  const labels = splitMulti(raw)
    .map(part => toFaEnumValue(field, part))
    .filter(Boolean);
  // de-dupe while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of labels) {
    if (seen.has(label)) continue;
    seen.add(label);
    unique.push(label);
  }
  return unique.join(" / ");
}

/** Persian labels list for admin multi-select state. */
export function toFaOptionList(
  field: CenterEnumField,
  raw: unknown
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const part of splitMulti(raw)) {
    const fa = toFaEnumValue(field, part);
    if (!fa || seen.has(fa)) continue;
    // Only keep known option labels for controlled selects.
    const known = resolveEntry(field, fa);
    if (!known) continue;
    seen.add(known.fa);
    labels.push(known.fa);
  }
  return labels;
}

/** Localize any centers fact enum/set field for public or panel display. */
export function localizeCenterFactValue(
  field: CenterEnumField,
  raw: unknown
): string {
  if (field === "dispatch_workforce_types") {
    return formatDispatchWorkforceDisplay(raw);
  }
  if (
    field === "room_types" ||
    field === "doctor_type" ||
    field === "caregiver_type" ||
    field === "dispatch_tehran_districts" ||
    field === "activity_days"
  ) {
    // SET-capable fields: support multi
    const multi = toFaSetValue(field, raw);
    if (multi) return multi;
    return "";
  }
  return toFaEnumValue(field, raw);
}

export function isKnownFaOption(field: CenterEnumField, raw: string): boolean {
  const entry = resolveEntry(field, raw);
  if (!entry) return false;
  return normalizeEnumToken(entry.fa) === normalizeEnumToken(raw);
}