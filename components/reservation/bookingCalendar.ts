/**
 * Shared helpers for the Jalali day strip in booking dialogs.
 *
 * The holiday webhook returns either a string[] of "YYYY-MM-DD" dates or, in
 * older rows, an array of `{ date: "YYYY-MM-DD" }` objects. The calendar used to
 * call `.includes()` on the raw value and only evaluated disable state once at
 * mount — before the holiday request finished — so closed days stayed clickable.
 */

export type JalaliDay = {
  formatted?: string;
  gy?: number;
  gm?: number;
  gd?: number;
  jy?: number;
  jm?: number;
  jd?: number;
  week?: string;
  month?: string;
};

/** Normalise every holiday shape the API may return into "YYYY-MM-DD" strings. */
export function normalizeHolidayDates(holidays: unknown): string[] {
  if (holidays == null) return [];

  if (typeof holidays === "string") {
    const trimmed = holidays.trim();
    if (!trimmed) return [];
    try {
      return normalizeHolidayDates(JSON.parse(trimmed));
    } catch {
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? [trimmed] : [];
    }
  }

  if (!Array.isArray(holidays)) return [];

  const dates: string[] = [];
  for (const item of holidays) {
    if (typeof item === "string") {
      const value = item.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) dates.push(value);
      continue;
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const value = String(record.date ?? record.formatted ?? "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) dates.push(value);
    }
  }
  return dates;
}

export function isHolidayDate(holidays: unknown, formatted: string): boolean {
  if (!formatted) return false;
  return normalizeHolidayDates(holidays).includes(formatted);
}

declare global {
  interface Window {
    jalaali?: {
      toJalaali: (gy: number, gm: number, gd: number) => {
        jy: number;
        jm: number;
        jd: number;
      };
      toGregorian: (jy: number, jm: number, jd: number) => {
        gy: number;
        gm: number;
        gd: number;
      };
      jalaaliMonthLength: (jy: number, jm: number) => number;
    };
  }
}

/** First bookable Gregorian date in a Jalali month, skipping holidays. */
export function getFirstWorkingDayOfJalaliMonth(
  jy: number,
  jm: number,
  holidays: unknown
): JalaliDay | null {
  if (typeof window === "undefined" || !window.jalaali) return null;

  const today = new Date();
  const { jy: currentJY, jm: currentJM, jd: currentJD } = window.jalaali.toJalaali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const monthLength = window.jalaali.jalaaliMonthLength(jy, jm);
  let day = jy === currentJY && jm === currentJM ? currentJD : 1;

  while (day <= monthLength) {
    const { gy, gm, gd } = window.jalaali.toGregorian(jy, jm, day);
    const date = new Date(gy, gm - 1, gd);
    const formatted = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
    if (!isHolidayDate(holidays, formatted)) {
      return {
        gy,
        gm,
        gd,
        month: date.toLocaleString("fa-IR", { month: "long" }),
        week: date.toLocaleString("fa-IR", { weekday: "long" }),
        jy,
        jm,
        jd: day,
        formatted
      };
    }
    day += 1;
  }

  return null;
}
