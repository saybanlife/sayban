import {
  today as todayLocal,
  toAsciiDigits,
  toPersianDigits,
  parseTime,
  timeToMinutes,
  timeParts,
  parseDate,
  compareDates,
  toJalali,
  formatJalaliLong,
  JALALI_MONTH_NAMES
} from "@/lib/datetime";
import {
  normalizeReminderList,
  reminderImageUrl
} from "@/lib/reminderTask";

export type ReminderHomeItem = {
  id: number;
  title: string;
  timeLabel: string;
  timeShort: string;
  type: string;
  isOccasion: boolean;
  dateIso: string | null;
  dayFa: string;
  monthFa: string;
  dateFa: string;
  imageUrl: string | null;
  raw: Record<string, unknown>;
};

function parseJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isReminderActive(row: Record<string, unknown>): boolean {
  if (row.active === 1 || row.active === "1" || row.active === true) return true;
  if (row.active === 0 || row.active === "0" || row.active === false) return false;
  const status = String(row.status || "").toLowerCase();
  return status === "active" || status === "";
}

export function isReminderForToday(
  row: Record<string, unknown>,
  todayISO: string,
  todayWeekday: string
): boolean {
  const schedule = String(row.schedule_type || "");
  if (schedule === "everyDay") {
    const weekdays = parseJsonArray(row.weekdays).map(v =>
      String(v).toLowerCase()
    );
    return weekdays.includes(todayWeekday);
  }
  const dates = parseJsonArray(row.dates).map(v => String(v));
  return dates.includes(todayISO);
}

export function earliestTimeRaw(row: Record<string, unknown>): string | null {
  const times = parseJsonArray(row.times);
  let best: string | null = null;
  let bestMin = Number.POSITIVE_INFINITY;
  for (const raw of times) {
    const value = parseTime(raw);
    const mins = timeToMinutes(value);
    if (mins == null) continue;
    if (mins < bestMin) {
      bestMin = mins;
      best = value;
    }
  }
  return best;
}

export function formatTimeShortFa(raw: unknown): string | null {
  const value = parseTime(raw);
  const parts = timeParts(value);
  if (!parts) return null;
  const hh = toPersianDigits(String(parts.hour).padStart(2, "0"));
  const mm = toPersianDigits(String(parts.minute).padStart(2, "0"));
  return `${hh}:${mm}`;
}

export function formatTodayTimeLine(raw: unknown): string | null {
  const short = formatTimeShortFa(raw);
  return short ? `امروز، ساعت ${short}` : null;
}

function reminderType(row: Record<string, unknown>): string {
  return String(row.type || row.category || row.category_name || "").toLowerCase();
}

export function isOccasionReminder(row: Record<string, unknown>): boolean {
  const type = reminderType(row);
  if (type.includes("occasion") || type.includes("gift")) return true;
  const schedule = String(row.schedule_type || "");
  return schedule === "everyYear" || schedule === "once";
}

function nextFutureDate(
  row: Record<string, unknown>,
  todayISO: string
): string | null {
  const dates = parseJsonArray(row.dates)
    .map(v => parseDate(v))
    .filter((v): v is string => Boolean(v));
  dates.sort(compareDates);
  for (const d of dates) {
    if (compareDates(d, todayISO) >= 0) return d;
  }
  return dates[0] || null;
}

function jalaliBits(dateIso: string | null): {
  dayFa: string;
  monthFa: string;
  dateFa: string;
} {
  if (!dateIso) {
    return { dayFa: "", monthFa: "", dateFa: "" };
  }
  const j = toJalali(dateIso);
  if (!j) {
    return { dayFa: "", monthFa: "", dateFa: formatJalaliLong(dateIso) || "" };
  }
  return {
    dayFa: toPersianDigits(String(j.jd)),
    monthFa: JALALI_MONTH_NAMES[j.jm - 1] || "",
    dateFa: formatJalaliLong(dateIso) || ""
  };
}

function toHomeItem(
  row: Record<string, unknown>,
  dateIso: string | null
): ReminderHomeItem | null {
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const title = String(row.name || row.title || "").trim();
  if (!title) return null;
  const timeRaw = earliestTimeRaw(row);
  const timeShort = formatTimeShortFa(timeRaw) || "";
  const timeLabel = formatTodayTimeLine(timeRaw) || timeShort;
  const bits = jalaliBits(dateIso);
  return {
    id,
    title,
    timeLabel,
    timeShort,
    type: reminderType(row),
    isOccasion: isOccasionReminder(row),
    dateIso,
    dayFa: bits.dayFa,
    monthFa: bits.monthFa,
    dateFa: bits.dateFa,
    imageUrl: reminderImageUrl(row),
    raw: row
  };
}

export function pickTodayReminders(data: unknown): ReminderHomeItem[] {
  const rows = normalizeReminderList(data);
  const now = new Date();
  const todayISO = todayLocal(now);
  const todayWeekday = now
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Tehran" })
    .toLowerCase();

  const items: ReminderHomeItem[] = [];
  for (const row of rows) {
    if (!isReminderActive(row)) continue;
    if (!isReminderForToday(row, todayISO, todayWeekday)) continue;
    const item = toHomeItem(row, todayISO);
    if (!item) continue;
    items.push(item);
  }

  items.sort((a, b) => {
    const aMin =
      timeToMinutes(earliestTimeRaw(a.raw) || "") ?? Number.POSITIVE_INFINITY;
    const bMin =
      timeToMinutes(earliestTimeRaw(b.raw) || "") ?? Number.POSITIVE_INFINITY;
    return aMin - bMin;
  });

  return items;
}

export function pickFirstTodayReminder(
  data: unknown
): ReminderHomeItem | null {
  return pickTodayReminders(data)[0] || null;
}

/** Next non-today (or occasion) reminders for the green “upcoming” strip. */
export function pickUpcomingReminders(
  data: unknown,
  limit = 4
): ReminderHomeItem[] {
  const rows = normalizeReminderList(data);
  const now = new Date();
  const todayISO = todayLocal(now);
  const todayWeekday = now
    .toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Tehran" })
    .toLowerCase();

  const scored: Array<{ item: ReminderHomeItem; score: string }> = [];
  for (const row of rows) {
    if (!isReminderActive(row)) continue;
    const forToday = isReminderForToday(row, todayISO, todayWeekday);
    const occasion = isOccasionReminder(row);
    if (forToday && !occasion) continue;

    const dateIso = nextFutureDate(row, todayISO);
    if (!dateIso && !occasion) continue;
    // Skip pure today duplicates unless occasion with a future date.
    if (forToday && dateIso === todayISO && !occasion) continue;

    const item = toHomeItem(row, dateIso);
    if (!item) continue;
    if (!item.dayFa && occasion) {
      // Fallback: show today bits for occasion without date.
      const bits = jalaliBits(todayISO);
      item.dayFa = bits.dayFa;
      item.monthFa = bits.monthFa;
      item.dateFa = bits.dateFa;
      item.dateIso = todayISO;
    }
    scored.push({ item, score: dateIso || "9999-12-31" });
  }

  scored.sort((a, b) => compareDates(a.score, b.score));
  return scored.slice(0, limit).map(s => s.item);
}

export function dayDigitBoxes(day: string): string[] {
  const ascii = toAsciiDigits(day).replace(/\D/g, "").padStart(2, "0");
  return Array.from(toPersianDigits(ascii.slice(-2)));
}

export function tehranDateParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tehran"
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  const weekday = bag.weekday || "";
  const day = bag.day || "";
  const month = bag.month || "";
  const year = bag.year || "";
  return {
    weekday,
    day,
    month,
    year,
    full: [weekday, day, month].filter(Boolean).join(" "),
    fullShort: [day, month, year].filter(Boolean).join(" ")
  };
}
