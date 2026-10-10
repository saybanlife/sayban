/**
 * Canonical date/time value layer for Sayban.
 *
 * Every picker in the app used to emit loose numbers (`{hour, minute}`,
 * `{day, month, year}`) and each consumer re-implemented formatting on its own.
 * That produced the bugs this module exists to make impossible:
 *
 *   - `"9:5"` instead of `"09:05"` (missing zero padding)
 *   - hour `0` treated as "unset" because `0` is falsy
 *   - `"2026-3-7"` instead of `"2026-03-07"`
 *   - off-by-one days from `toISOString()` on a UTC+03:30 wall clock
 *   - Persian digits (`۰۷:۰۰`) reaching MySQL
 *
 * The contract is deliberately narrow and stringly-typed at the boundary:
 *
 *   DateValue → "YYYY-MM-DD"  Gregorian, zero-padded, ASCII digits
 *   TimeValue → "HH:mm"       24-hour, zero-padded, ASCII digits
 *
 * Anything that cannot be represented that way is `""`, never a partial or
 * malformed string. Jalali stays a *presentation* concern: it is converted at
 * the UI edge and never stored or transmitted.
 */

import Jalaali from "jalaali-js";

/** `"YYYY-MM-DD"` Gregorian, or `""` when unset. */
export type DateValue = string;
/** `"HH:mm"` 24-hour, or `""` when unset. */
export type TimeValue = string;

export type JalaliParts = { jy: number; jm: number; jd: number };
export type TimeParts = { hour: number; minute: number };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند"
] as const;

/** JS `Date#getDay()` order: Sun…Sat. */
const PERSIAN_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه"
] as const;

export const JALALI_MONTH_NAMES: readonly string[] = PERSIAN_MONTHS;

/**
 * Normalizes Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII.
 *
 * Both ranges matter: `Intl` emits Persian digits, but some ICU builds and
 * pasted user input use the Arabic-Indic block instead.
 */
export function toAsciiDigits(input: unknown): string {
  return String(input ?? "").replace(/[۰-۹٠-٩]/g, char => {
    const code = char.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

export function toPersianDigits(input: unknown): string {
  return String(input ?? "").replace(/\d/g, digit =>
    String.fromCharCode(0x06f0 + Number(digit))
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// ---------------------------------------------------------------- time -----

/**
 * Builds a `TimeValue` from raw hour/minute.
 *
 * Returns `""` for out-of-range input rather than clamping, so a bad value
 * surfaces as "empty" instead of silently becoming a plausible wrong time.
 */
export function buildTime(hour: unknown, minute: unknown): TimeValue {
  const h = Number(toAsciiDigits(hour));
  const m = Number(toAsciiDigits(minute));
  if (!Number.isInteger(h) || !Number.isInteger(m)) return "";
  if (h < 0 || h > 23 || m < 0 || m > 59) return "";
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * Accepts anything the app has historically stored — `"9:5"`, `"08:00:00"`,
 * `"۰۷:۳۰"`, `{hour, minute}` — and returns a canonical `TimeValue`.
 */
export function parseTime(raw: unknown): TimeValue {
  if (raw == null || raw === "") return "";

  if (typeof raw === "object") {
    const candidate = raw as Partial<TimeParts>;
    if (candidate.hour != null || candidate.minute != null) {
      return buildTime(candidate.hour ?? 0, candidate.minute ?? 0);
    }
    return "";
  }

  const text = toAsciiDigits(raw).trim();
  if (!text) return "";
  const [hourPart, minutePart] = text.split(":");
  if (minutePart == null) return "";
  return buildTime(hourPart, minutePart);
}

export function isValidTime(raw: unknown): raw is TimeValue {
  return TIME_PATTERN.test(String(raw ?? ""));
}

/** Splits a canonical `TimeValue`; returns `null` when it is not one. */
export function timeParts(value: TimeValue): TimeParts | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Shape public TimeInput writes into `$state.time` (`{hour, minute, text}`). */
export type TimeInputState = TimeParts & { text: TimeValue };

/**
 * Any historical picker/API value → `{hour, minute, text}` for Plasmic `$state.time`.
 *
 * Panel TimeInput used to publish a bare `"HH:mm"` string. Screens that still
 * check `.hour` / `.minute` then treated a real selection as empty.
 */
export function timeValueToState(raw: unknown): TimeInputState | Record<string, never> {
  const text = parseTime(raw);
  const parts = timeParts(text);
  return parts ? { ...parts, text } : {};
}

/** Minutes since midnight, for ordering comparisons. `null` when invalid. */
export function timeToMinutes(value: TimeValue): number | null {
  const parts = timeParts(value);
  return parts ? parts.hour * 60 + parts.minute : null;
}

/** True when `end` is strictly later than `start`. Invalid input → false. */
export function isTimeRangeValid(start: TimeValue, end: TimeValue): boolean {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  if (from == null || to == null) return false;
  return to > from;
}

/** `"HH:mm"` → `"HH:mm:ss"`, which is what the reservation endpoints expect. */
export function withSeconds(value: TimeValue): string {
  return isValidTime(value) ? `${value}:00` : "";
}

/** Right-to-left display form used across the app: `mm : HH`. */
export function formatTimeForDisplay(value: TimeValue): string {
  const parts = timeParts(value);
  if (!parts) return "";
  return `${pad2(parts.minute)} : ${pad2(parts.hour)}`;
}

// ---------------------------------------------------------------- date -----

/** Builds a `DateValue` from Gregorian parts (month is 1-based). */
export function buildDate(
  year: unknown,
  month: unknown,
  day: unknown
): DateValue {
  const y = Number(toAsciiDigits(year));
  const m = Number(toAsciiDigits(month));
  const d = Number(toAsciiDigits(day));
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return "";
  }
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  // Reject impossible days (e.g. 31 April) by round-tripping through UTC,
  // which has no DST or offset to shift the result.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return "";
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Accepts `"2026-3-7"`, `"۱۴۰۵-۰۶-۰۹"`, `Date`, or a canonical value. */
export function parseDate(raw: unknown): DateValue {
  if (raw == null || raw === "") return "";
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return "";
    return buildDate(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }
  const text = toAsciiDigits(raw).trim();
  if (!text) return "";
  // Tolerate a trailing time part, e.g. "2026-03-07 09:00:00".
  const [datePart] = text.split(/[ T]/);
  const segments = datePart.split(/[-/]/);
  if (segments.length !== 3) return "";
  return buildDate(segments[0], segments[1], segments[2]);
}

export function isValidDate(raw: unknown): raw is DateValue {
  if (!DATE_PATTERN.test(String(raw ?? ""))) return false;
  return parseDate(raw) === raw;
}

/** Gregorian parts of a canonical `DateValue`. `null` when it is not one. */
export function dateParts(
  value: DateValue
): { year: number; month: number; day: number } | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

// -------------------------------------------------------------- jalali -----

/** `DateValue` → Jalali parts (month 1-based). `null` when invalid. */
export function toJalali(value: DateValue): JalaliParts | null {
  const parts = dateParts(value);
  if (!parts) return null;
  const { jy, jm, jd } = Jalaali.toJalaali(parts.year, parts.month, parts.day);
  return { jy, jm, jd };
}

/** Jalali parts (month 1-based) → canonical `DateValue`. */
export function fromJalali(jy: number, jm: number, jd: number): DateValue {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) {
    return "";
  }
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return "";
  if (jd > jalaliMonthLength(jy, jm)) return "";
  const { gy, gm, gd } = Jalaali.toGregorian(jy, jm, jd);
  return buildDate(gy, gm, gd);
}

/** Days in a Jalali month, correct for leap years (30 Esfand). */
export function jalaliMonthLength(jy: number, jm: number): number {
  return Jalaali.jalaaliMonthLength(jy, jm);
}

/** `"۹ شهریور ۱۴۰۵"` — the app's standard human-facing date. */
export function formatJalaliLong(value: DateValue): string {
  const jalali = toJalali(value);
  if (!jalali) return "";
  const monthName = PERSIAN_MONTHS[jalali.jm - 1] ?? "";
  return `${toPersianDigits(jalali.jd)} ${monthName} ${toPersianDigits(jalali.jy)}`;
}

/** `"شنبه ۱۱ مهر ۱۴۰۵"` — weekday + long Jalali (form date fields). */
export function formatJalaliWeekdayLong(value: DateValue): string {
  const jalali = toJalali(value);
  const parts = dateParts(value);
  if (!jalali || !parts) return "";
  // Local calendar weekday for the Gregorian Y-M-D (no UTC shift).
  const weekday = new Date(parts.year, parts.month - 1, parts.day).getDay();
  const weekdayName = PERSIAN_WEEKDAYS[weekday] ?? "";
  const monthName = PERSIAN_MONTHS[jalali.jm - 1] ?? "";
  return `${weekdayName} ${toPersianDigits(jalali.jd)} ${monthName} ${toPersianDigits(jalali.jy)}`.trim();
}

/** `"۱۴۰۵/۰۶/۰۹"` — compact form for inputs and chips. */
export function formatJalaliShort(value: DateValue): string {
  const jalali = toJalali(value);
  if (!jalali) return "";
  return toPersianDigits(`${jalali.jy}/${pad2(jalali.jm)}/${pad2(jalali.jd)}`);
}

// --------------------------------------------------------------- today -----

/**
 * Today as a canonical `DateValue`, read from the browser's local calendar.
 *
 * Deliberately avoids `toISOString()`, which reports the UTC day and therefore
 * returns *yesterday* between 00:00 and 03:30 Tehran time — the source of the
 * off-by-one bugs in the reminder screens.
 */
export function today(now: Date = new Date()): DateValue {
  return buildDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function todayJalali(now: Date = new Date()): JalaliParts {
  const parts = toJalali(today(now));
  // `today()` always yields a valid value, so this fallback is unreachable in
  // practice; it exists to keep the return type non-nullable for callers.
  return parts ?? { jy: 1400, jm: 1, jd: 1 };
}

/** Negative when `a` is earlier, 0 when equal, positive when later. */
export function compareDates(a: DateValue, b: DateValue): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isPastDate(value: DateValue, now: Date = new Date()): boolean {
  if (!isValidDate(value)) return false;
  return compareDates(value, today(now)) < 0;
}

/** Shifts by whole days without touching local time or DST. */
export function addDays(value: DateValue, days: number): DateValue {
  const parts = dateParts(value);
  if (!parts) return "";
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days)
  );
  return buildDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
}

/**
 * The next time this month/day comes around: this year if it has not passed,
 * otherwise next year.
 *
 * Used by the yearly reminders, which care about "5 Mordad" rather than a
 * specific year. The comparison is on whole days, so an occurrence *today*
 * counts as upcoming — the previous implementation compared local midnight
 * against the current time and skipped a full year on the day itself.
 */
export function nextAnnualOccurrence(
  value: DateValue,
  now: Date = new Date()
): DateValue {
  const parts = dateParts(value);
  if (!parts) return "";
  const reference = today(now);
  const currentYear = Number(reference.slice(0, 4));

  const thisYear = buildDate(currentYear, parts.month, parts.day);
  if (thisYear && compareDates(thisYear, reference) >= 0) return thisYear;

  const nextYear = buildDate(currentYear + 1, parts.month, parts.day);
  // 29 February only exists in leap years; fall back to the following one.
  return nextYear || buildDate(currentYear + 4, parts.month, parts.day);
}

/** Weekday key matching the `day_of_week` values used by the centers API. */
export function weekdayKey(value: DateValue): string {
  const parts = dateParts(value);
  if (!parts) return "";
  const index = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day)
  ).getUTCDay();
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index];
}

// ----------------------------------------------------------- combined -----

/**
 * `"YYYY-MM-DD HH:mm:ss"` for the reservation endpoints.
 * Returns `""` unless both halves are valid, so a half-filled form can never
 * post `"undefined 08:00"`.
 */
export function joinDateTime(date: DateValue, time: TimeValue): string {
  if (!isValidDate(date) || !isValidTime(time)) return "";
  return `${date} ${withSeconds(time)}`;
}

/** Splits `"YYYY-MM-DD HH:mm[:ss]"` back into canonical halves. */
export function splitDateTime(raw: unknown): {
  date: DateValue;
  time: TimeValue;
} {
  const text = toAsciiDigits(raw).trim();
  if (!text) return { date: "", time: "" };
  const [datePart, timePart] = text.split(/[ T]/);
  return { date: parseDate(datePart), time: parseTime(timePart) };
}
