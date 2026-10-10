import { isPureNursingCenter } from "./centerEnumLocales";

export type CenterServiceItem = {
  id?: string | number;
  name?: string;
  description?: string;
  final_price?: number;
  duration_minutes?: number;
  [key: string]: unknown;
};

export type CenterReviewItem = {
  id?: string | number;
  /** Panel `/panel/center` reviews query aliases `r.id` as `review_id`. */
  review_id?: string | number;
  name?: string;
  user_name?: string;
  comment?: string;
  rating?: number | string;
  created_at?: string;
  avatar?: string;
  image?: string;
  role?: string;
  user_type?: string;
  label?: string;
  admin_reply?: string | null;
  admin_replied_at?: string | null;
  [key: string]: unknown;
};

/** Prefer `id`, fall back to panel's `review_id` alias. */
export function resolveCenterReviewId(
  review?: { id?: unknown; review_id?: unknown } | null
): number {
  const raw = review?.id ?? review?.review_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type StarBreakdownItem = {
  star: number;
  percent: number;
  count: number;
};

export function buildStarBreakdown(
  percentages?: Record<string | number, number>,
  totalCount = 0
): StarBreakdownItem[] {
  return [5, 4, 3, 2, 1].map(star => {
    const percent = Number(percentages?.[star] ?? percentages?.[String(star)] ?? 0);
    const count =
      totalCount > 0 ? Math.round((percent / 100) * totalCount) : 0;
    return { star, percent, count };
  });
}

export function getReviewDisplayName(review?: CenterReviewItem) {
  return review?.user_name || review?.name || "کاربر بی‌نام";
}

export function getReviewRoleLabel(review?: CenterReviewItem) {
  return review?.role || review?.user_type || review?.label || "";
}

export function formatRelativeDateFa(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "امروز";
  if (diffDays === 1) return "دیروز";
  if (diffDays < 30) return `${diffDays} روز پیش`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} ماه پیش`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} سال پیش`;
}

export type CenterTag = {
  name?: string;
  value?: string;
  label?: string;
  title?: string;
  description?: string;
  tag_name?: string;
  tag_value?: string;
  icon?: string;
};
export type CenterImage = { image_url?: string };
export type CenterContact = {
  type?: string;
  url?: string;
  value?: string;
  link?: string;
  contact?: string;
};
export type CenterFaqItem = {
  question?: string;
  title?: string;
  answer?: string;
  description?: string;
  body?: string;
};

export type CenterAmenityItem = {
  id?: string | number;
  name?: string;
  slug?: string;
  icon?: string;
  description?: string;
  sort_order?: number;
};

export type KeyInfoRawItem = {
  key?: string;
  id?: string | number;
  label?: string;
  name?: string;
  title?: string;
  value?: string;
  description?: string;
  body?: string;
  detail?: string;
  icon?: string;
  sort_order?: number;
};

export type KeyInfoItem = { label: string; value: string };

export type CenterResult = {
  id?: string | number;
  name?: string;
  description?: string;
  main_image?: string;
  banner_image?: string;
  image?: CenterImage[];
  address?: string;
  phone?: string;
  latitude?: number | string;
  longitude?: number | string;
  /** Multiline string, e.g. "شنبه تا چهارشنبه ۸:۰۰ — ۱۷:۰۰\\r\\nپنج‌شنبه ۸:۰۰ — ۱۳:۰۰" */
  working_hours?: string;
  services?: CenterServiceItem[];
  amenities?: CenterAmenityItem[];
  contacts?: CenterContact[];
  rating_avg?: number | string;
  total_count?: number;
  tags?: CenterTag[];
  instagram?: string;
  instagram_url?: string;
  website?: string;
  website_url?: string;
  site_url?: string;
  faq?: CenterFaqItem[];
  faqs?: CenterFaqItem[];
  questions?: CenterFaqItem[];
  key_info?: KeyInfoRawItem[];
  key_infos?: KeyInfoRawItem[];
  attributes?: KeyInfoRawItem[];
  /** Structured panel-managed care/treatment checklist */
  care_treatment?: KeyInfoRawItem[];
  daily_life?: KeyInfoRawItem[];
  family_visit?: KeyInfoRawItem[];
  /** Panel relational profile fields (from GET /center/ webhook when enriched) */
  daily_schedule?: {
    wake_time?: string | null;
    sleep_time?: string | null;
    daily_routine_desc?: string | null;
    weekly_schedule_sample?: string | null;
    allows_family_participation?: boolean | number | string;
    has_special_needs_program?: boolean | number | string;
  } | null;
  activities?: {
    id?: number | string;
    name?: string;
    slug?: string;
    icon?: string;
    sort_order?: number;
    note?: string | null;
  }[];
  care_items?: {
    id?: number | string;
    name?: string;
    slug?: string;
    has_it?: boolean | number | string;
    note?: string | null;
    sort_order?: number;
  }[];
  specialists?: {
    id?: number | string;
    specialist_type?: string;
    frequency?: string | null;
    doctor_kind?: string | null;
    visit_interval?: string | null;
    days_of_week?: string | null;
    is_active?: boolean | number | string;
  }[];
  visit_policy?: {
    visit_days?: string | null;
    visit_hours?: string | null;
    needs_prior_coordination?: boolean | number | string;
    max_visitors_count?: number | string | null;
    allows_private_visit?: boolean | number | string;
    allows_open_space_visit?: boolean | number | string;
    allows_phone_contact?: boolean | number | string;
    allows_video_contact?: boolean | number | string;
    contact_hours?: string | null;
    allows_temporary_leave?: boolean | number | string;
    temporary_leave_conditions?: string | null;
    allows_overnight_leave?: boolean | number | string;
    status_report_method?: string | null;
    status_report_frequency?: string | null;
    contact_person_role?: string | null;
    allows_direct_staff_contact?: boolean | number | string;
    complaint_method?: string | null;
    complaint_response_time?: string | null;
  } | null;
  working_hours_rows?: {
    day_of_week?: string;
    open_time?: string | null;
    close_time?: string | null;
    is_closed?: boolean | number | string;
  }[];
  /** Direct profile fact fields (admin panel / public overview) */
  center_type?: string;
  care_domain?: string;
  admission_gender?: string;
  total_capacity?: number | string;
  founded_year?: number | string;
  care_staff_count?: number | string;
  active_staff_count?: number | string;
  min_work_experience_value?: number | string;
  min_work_experience_unit?: string;
  dispatch_tehran_districts?: string | string[];
  dispatch_lead_time?: string;
  urgent_dispatch?: string;
  activity_days?: string | string[];
  response_hours_start?: string;
  response_hours_end?: string;
  min_monthly_fee?: number | string;
  max_monthly_fee?: number | string;
  has_night_nurse?: boolean | number | string;
  distance_to_hospital_km?: number | string;
  doctor_type?: string;
  caregiver_type?: string;
  room_types?: string | string[];
  dispatch_workforce_types?: string | string[];
  license_type?: string;
  staff?: unknown[] | null;
  staffs?: unknown[] | null;
};

export function normalizePhone(phone?: string) {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

function contactUrl(contact?: CenterContact) {
  if (!contact) return "";
  return contact.url || contact.value || contact.link || contact.contact || "";
}

export function findContactUrl(
  contacts: CenterContact[] | undefined,
  type: string
) {
  const match = (contacts || []).find(c => c?.type === type);
  return contactUrl(match);
}

export function getSocialLinks(result?: CenterResult) {
  if (!result) return { instagramUrl: "", websiteUrl: "" };
  const instagramUrl =
    result.instagram_url ||
    result.instagram ||
    findContactUrl(result.contacts, "instagram");
  const websiteUrl =
    result.website_url ||
    result.website ||
    result.site_url ||
    findContactUrl(result.contacts, "website");
  return { instagramUrl, websiteUrl };
}

export function normalizeExternalUrl(
  value?: string,
  kind: "instagram" | "website" = "website"
) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (kind === "instagram") {
    const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "");
    return `https://instagram.com/${handle}`;
  }
  return `https://${raw.replace(/^\/\//, "")}`;
}

export function getSocialDisplayLabel(
  value?: string,
  kind: "instagram" | "website" = "website"
) {
  const raw = (value || "").trim();
  if (!raw) return kind === "instagram" ? "صفحه اینستاگرام" : "وب‌سایت مرکز";

  if (kind === "instagram") {
    const fromUrl = raw.match(/instagram\.com\/([^/?#]+)/i)?.[1];
    const handle = (fromUrl || raw.replace(/^@/, "")).trim();
    if (handle && !handle.includes("/") && !/^https?:/i.test(handle)) {
      return handle.startsWith("@") ? handle : `@${handle}`;
    }
    return "صفحه اینستاگرام";
  }

  try {
    const href = normalizeExternalUrl(raw, "website");
    const host = new URL(href).hostname.replace(/^www\./i, "");
    return host || "وب‌سایت مرکز";
  } catch {
    return "وب‌سایت مرکز";
  }
}

/** Empty is allowed. Accepts @handle, handle, or instagram.com URL. */
export function validateInstagramInput(value?: string): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  if (/\s/.test(raw)) return "آدرس اینستاگرام معتبر نیست.";

  if (/instagram\.com/i.test(raw) || /^https?:\/\//i.test(raw)) {
    const match = raw.match(
      /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?/i
    );
    if (!match) return "لینک اینستاگرام معتبر نیست.";
    return null;
  }

  const handle = raw.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
    return "نام کاربری اینستاگرام معتبر نیست.";
  }
  return null;
}

/** Empty is allowed. Accepts full URL or bare domain. */
export function validateWebsiteInput(value?: string): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  if (/\s/.test(raw)) return "آدرس وب‌سایت معتبر نیست.";
  try {
    const href = normalizeExternalUrl(raw, "website");
    const url = new URL(href);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) {
      return "آدرس وب‌سایت معتبر نیست.";
    }
    return null;
  } catch {
    return "آدرس وب‌سایت معتبر نیست.";
  }
}

export function validateSocialFields(instagram?: string, website?: string) {
  const igErr = validateInstagramInput(instagram);
  if (igErr) return { ok: false as const, message: igErr };
  const webErr = validateWebsiteInput(website);
  if (webErr) return { ok: false as const, message: webErr };
  return { ok: true as const, message: "" };
}

/** Trim and normalize for API (`instagram_url` / `website_url`). */
export function normalizeSocialInput(
  value?: string,
  kind: "instagram" | "website" = "website"
) {
  const raw = (value || "").trim();
  if (!raw) return "";
  return normalizeExternalUrl(raw, kind);
}

export function getDirectionsUrl(
  lat?: number | string,
  lng?: number | string,
  name?: string
) {
  if (lat == null || lng == null || lat === "" || lng === "") return "";
  if (typeof window === "undefined") {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  const ua = window.navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return `https://maps.apple.com/?q=${lat},${lng}`;
  }
  if (/Mobi|Android/i.test(ua)) {
    const label = name || "center";
    return `geo:${lat},${lng}?q=${encodeURIComponent(label)}`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function normalizeKeyInfoItem(item: KeyInfoRawItem | CenterTag): KeyInfoItem | null {
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

/**
 * `working_hours` is a raw multiline string. Split on \\n / \\r\\n and
 * return only the first non-empty line. Empty / undefined => "".
 */
export function getFirstBusinessHours(result?: CenterResult): string {
  if (isPureNursingCenter(result?.care_domain)) return "";
  const raw = result?.working_hours;
  if (raw == null || typeof raw !== "string") return "";

  const lines = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return lines[0] || "";
}

export type WorkingHoursRow = {
  label: string;
  value: string;
};

const WORKING_HOURS_TIME_START = /[۰-۹\d]/;

/** Split one line of `working_hours` into day label + time range. */
export function parseWorkingHoursLine(line: string): WorkingHoursRow {
  const trimmed = line.trim();
  if (!trimmed) return { label: "", value: "" };

  const colonMatch = trimmed.match(/^(.+?)[:：]\s*(.+)$/);
  if (colonMatch && !WORKING_HOURS_TIME_START.test(colonMatch[1].charAt(0))) {
    return { label: colonMatch[1].trim(), value: colonMatch[2].trim() };
  }

  const spacedMatch = trimmed.match(/^(.+?)\s+((?:[۰-۹\d]).+)$/);
  if (spacedMatch) {
    return { label: spacedMatch[1].trim(), value: spacedMatch[2].trim() };
  }

  return { label: trimmed, value: "" };
}

export function getWorkingHoursRows(result?: CenterResult): WorkingHoursRow[] {
  if (isPureNursingCenter(result?.care_domain)) return [];
  const structured = result?.working_hours_rows;
  if (Array.isArray(structured) && structured.length > 0) {
    const DAY_LABEL_FA: Record<string, string> = {
      sat: "شنبه",
      saturday: "شنبه",
      sun: "یکشنبه",
      sunday: "یکشنبه",
      mon: "دوشنبه",
      monday: "دوشنبه",
      tue: "سه‌شنبه",
      tuesday: "سه‌شنبه",
      wed: "چهارشنبه",
      wednesday: "چهارشنبه",
      thu: "پنج‌شنبه",
      thursday: "پنج‌شنبه",
      fri: "جمعه",
      friday: "جمعه"
    };
    const trimTime = (value?: string | null) => {
      if (!value) return "";
      const m = String(value).trim().match(/^(\d{1,2}:\d{2})/);
      return m ? m[1] : String(value).trim();
    };
    return structured
      .map(row => {
        const dayKey = String(row.day_of_week || "")
          .trim()
          .toLowerCase();
        const label = DAY_LABEL_FA[dayKey] || String(row.day_of_week || "").trim();
        const closed =
          row.is_closed === true ||
          row.is_closed === 1 ||
          String(row.is_closed) === "1";
        if (!label) return null;
        if (closed) return { label, value: "تعطیل" };
        const open = trimTime(row.open_time);
        const close = trimTime(row.close_time);
        if (!open && !close) return null;
        return { label, value: `${open || "—"} — ${close || "—"}` };
      })
      .filter((row): row is WorkingHoursRow => Boolean(row));
  }

  const raw = result?.working_hours;
  if (raw == null || typeof raw !== "string") return [];

  return raw
    .split(/\r?\n/)
    .map(parseWorkingHoursLine)
    .filter(row => row.label || row.value);
}

function withBusinessHoursItem(items: KeyInfoItem[], result?: CenterResult) {
  const hours = getFirstBusinessHours(result);
  if (!hours) return items;

  const alreadyPresent = items.some(item =>
    /ساعات|business|hours|working/i.test(`${item.label} ${item.value}`)
  );
  if (alreadyPresent) return items;

  return [...items, { label: "ساعات کاری", value: hours }];
}

export function getKeyInfoItems(result?: CenterResult): KeyInfoItem[] {
  if (!result) return [];

  const structured =
    result.key_info || result.key_infos || result.attributes || [];
  if (Array.isArray(structured) && structured.length > 0) {
    const items = structured
      .map(normalizeKeyInfoItem)
      .filter((item): item is KeyInfoItem => Boolean(item));
    return withBusinessHoursItem(items, result);
  }

  const tags = result.tags || [];
  if (tags.length > 0) {
    const items = tags
      .map(normalizeKeyInfoItem)
      .filter((item): item is KeyInfoItem => Boolean(item));
    return withBusinessHoursItem(items, result);
  }

  const services = result.services || [];
  const items: KeyInfoItem[] = [
    {
      label: "امتیاز",
      value: result.rating_avg ? `${result.rating_avg} از ۵` : "—"
    },
    {
      label: "تعداد نظرات",
      value: result.total_count ? `${result.total_count} نظر` : "—"
    },
    {
      label: "خدمات",
      value: services.length ? `${services.length} مورد` : "—"
    },
    {
      label: "تلفن",
      value: result.phone || "—"
    }
  ];

  return withBusinessHoursItem(items, result);
}

export function getFaqItems(result?: CenterResult): CenterFaqItem[] {
  if (!result) return [];
  const raw = result.faq || result.faqs || result.questions || [];
  return (Array.isArray(raw) ? raw : []).filter(
    item =>
      (item?.question || item?.title) &&
      (item?.answer || item?.description || item?.body)
  );
}

export function getAmenityItems(result?: CenterResult): CenterAmenityItem[] {
  if (!result) return [];
  if (isPureNursingCenter(result.care_domain)) return [];
  const raw = result.amenities || [];
  return (Array.isArray(raw) ? raw : []).filter(item => item?.name);
}

export function getHeroImageSrc(result?: CenterResult) {
  return result?.main_image || result?.image?.[0]?.image_url;
}
