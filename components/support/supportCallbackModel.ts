/**
 * Support callback (درخواست تماس) helpers for nurse-request dialog.
 */

export type SupportCallbackTimePreference = "anytime" | "specific";

export type SupportCallbackRequest = {
  id: number;
  user_id: number;
  phone: string;
  time_preference: SupportCallbackTimePreference;
  preferred_time?: string | null;
  source?: string | null;
  created_at?: string;
  user_name?: string | null;
  user_mobile?: string | null;
};

/** Tehran business hours for support outbound calls. */
export const SUPPORT_WORK_HOUR_START = 8;
export const SUPPORT_WORK_HOUR_END = 18;

export function toEnglishDigits(value: string) {
  return String(value || "")
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function digitsOnlyPhone(value: unknown): string {
  return toEnglishDigits(String(value ?? "")).replace(/\D/g, "");
}

/** Display like ۰۹۱۲۳۴۵۶۷۸۹ (Persian digits, no spaces) */
export function formatPhoneDisplay(value: unknown): string {
  const digits = digitsOnlyPhone(value);
  if (!digits) return "";
  return digits.replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function isValidMobilePhone(value: unknown): boolean {
  const digits = digitsOnlyPhone(value);
  return /^09\d{9}$/.test(digits);
}

export function profileMobile(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "";
  const row = profile as Record<string, unknown>;
  return digitsOnlyPhone(row.mobile ?? row.phone ?? row.tel ?? "");
}

/** Current hour in Asia/Tehran (0–23). */
export function tehranHour(now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      hour: "numeric",
      hour12: false
    }).formatToParts(now);
    const hour = Number(parts.find(part => part.type === "hour")?.value);
    return Number.isFinite(hour) ? hour % 24 : now.getHours();
  } catch {
    return now.getHours();
  }
}

export function isWithinSupportWorkHours(now = new Date()): boolean {
  const hour = tehranHour(now);
  return hour >= SUPPORT_WORK_HOUR_START && hour < SUPPORT_WORK_HOUR_END;
}

export function supportOffHoursNotice(now = new Date()): {
  outside: boolean;
  lines: string[];
} {
  if (isWithinSupportWorkHours(now)) {
    return { outside: false, lines: [] };
  }
  return {
    outside: true,
    lines: [
      "پشتیبان فردا ساعت ۸ صبح تماس می‌گیرد",
      `الان خارج از ساعت کاری است (${SUPPORT_WORK_HOUR_START} تا ${SUPPORT_WORK_HOUR_END}).`
    ]
  };
}

export function normalizeCallbackTimePreference(
  value: unknown
): SupportCallbackTimePreference {
  return value === "specific" ? "specific" : "anytime";
}

export function normalizePreferredTime(value: unknown): string | null {
  const raw = toEnglishDigits(String(value ?? "")).trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizeSupportCallbackRows(raw: unknown): SupportCallbackRequest[] {
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.result)) {
        return normalizeSupportCallbackRows(obj.result);
      }
    }
    return [];
  }
  return raw
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = Number(row.id);
      const user_id = Number(row.user_id);
      const phone = digitsOnlyPhone(row.phone);
      if (!Number.isInteger(id) || id <= 0) return null;
      if (!Number.isInteger(user_id) || user_id <= 0) return null;
      if (!phone) return null;
      return {
        id,
        user_id,
        phone,
        time_preference: normalizeCallbackTimePreference(row.time_preference),
        preferred_time:
          row.preferred_time != null ? String(row.preferred_time) : null,
        source: row.source != null ? String(row.source) : null,
        created_at: row.created_at != null ? String(row.created_at) : undefined,
        user_name: row.user_name != null ? String(row.user_name) : null,
        user_mobile:
          row.user_mobile != null ? digitsOnlyPhone(row.user_mobile) : null
      } satisfies SupportCallbackRequest;
    })
    .filter(Boolean) as SupportCallbackRequest[];
}