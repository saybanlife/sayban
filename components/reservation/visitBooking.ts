/**
 * Visit booking («رزرو وقت بازدید») — validation and payload building.
 *
 * The center page used to interpolate the picker state straight into the
 * request body:
 *
 *   start_time: `${$state.calendar.selected} ${$state.selectTime.selected.slot_start}`
 *
 * `calendar.selected` is `undefined` until the Jalali CDN script has loaded (and
 * `0` when the holiday query is still pending), so the body could carry
 * "undefined 08:00". MariaDB runs non-strict and coerced that to
 * '0000-00-00 00:00:00', which then broke every consumer that formats the date.
 *
 * Everything that builds or reads a reservation time goes through this module so
 * the rule lives in one place. The database has a matching CHECK constraint —
 * see scripts/sql/visit_reservation_service.sql.
 */

/** `centers__services.code` of the one visit service shared by every center. */
export const VISIT_SERVICE_CODE = "VISIT";
export const VISIT_SERVICE_NAME = "رزرو وقت بازدید";
export const VISIT_BOOKING_HEADING = "رزرو روز و ساعت بازدید";

export type BookingSlot = {
  slot_start?: string | null;
  slot_end?: string | null;
  status?: string | null;
};

export type BookingService = {
  id?: number | string | null;
  code?: string | null;
  name?: string | null;
  final_price?: number | string | null;
};

/** The synthetic service the visit flow puts into page state. */
export function visitService(): BookingService {
  return {
    id: null,
    code: VISIT_SERVICE_CODE,
    name: VISIT_SERVICE_NAME,
    final_price: 0
  };
}

export function isVisitService(service: unknown): boolean {
  const candidate = service as BookingService | null;
  const code = candidate?.code;
  if (typeof code === "string" && code.toUpperCase() === VISIT_SERVICE_CODE) {
    return true;
  }
  const name = candidate?.name;
  return typeof name === "string" && name.trim() === VISIT_SERVICE_NAME;
}

/**
 * A calendar date the server can store: "YYYY-MM-DD", a real day, year >= 2000.
 * The lower bound is what rejects the zero date and any Jalali year leaking
 * through unconverted.
 */
export function isValidBookingDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** "8:5" | "08:05" | "08:05:00" -> "08:05:00"; anything else -> null. */
export function normalizeSlotTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function isValidBookingSlot(slot: unknown): slot is BookingSlot {
  const candidate = slot as BookingSlot | null;
  if (!candidate || typeof candidate !== "object") return false;
  if (candidate.status && candidate.status !== "available") return false;
  return (
    normalizeSlotTime(candidate.slot_start) != null &&
    normalizeSlotTime(candidate.slot_end) != null
  );
}

/** Guard for the confirm button: both a real day and a bookable slot. */
export function canConfirmBooking(date: unknown, slot: unknown): boolean {
  return isValidBookingDate(date) && isValidBookingSlot(slot);
}

/** Companion id for reservations; 0 / empty means “for myself”. */
export function normalizePatientId(value: unknown): number | string | null {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

export type ReservationPayload = {
  center_id: string;
  service_id: number | string | null;
  service_code?: string;
  service_location: "center";
  start_time: string;
  end_time: string;
  final_price: number;
  patient_id: number | string | null;
};

/**
 * The reservation body, or `null` when the selection is incomplete — callers
 * must treat `null` as "do not submit".
 */
export function buildReservationPayload(input: {
  centerId?: string | null;
  service?: BookingService | null;
  date?: unknown;
  slot?: unknown;
  patientId?: number | string | null;
}): ReservationPayload | null {
  const { centerId, service, date, slot, patientId } = input;
  if (!centerId) return null;
  if (!isValidBookingDate(date)) return null;
  if (!isValidBookingSlot(slot)) return null;

  const start = normalizeSlotTime((slot as BookingSlot).slot_start);
  const end = normalizeSlotTime((slot as BookingSlot).slot_end);
  if (!start || !end) return null;

  const visit = isVisitService(service);
  const serviceId = visit ? null : (service?.id ?? null);
  if (!visit && serviceId == null) return null;

  const price = Number(service?.final_price);

  return {
    center_id: centerId,
    service_id: serviceId,
    ...(visit ? { service_code: VISIT_SERVICE_CODE } : {}),
    service_location: "center",
    start_time: `${date} ${start}`,
    end_time: `${date} ${end}`,
    final_price: Number.isFinite(price) ? price : 0,
    patient_id: normalizePatientId(patientId)
  };
}

/**
 * Params for `GET /service/working/`. The visit service belongs to no center, so
 * its slots are looked up by code + center instead of by service id.
 */
export function buildSlotQueryParams(input: {
  centerId?: string | null;
  service?: BookingService | null;
  date?: unknown;
}): Record<string, string> | null {
  const { centerId, service, date } = input;
  if (!isValidBookingDate(date)) return null;

  if (isVisitService(service)) {
    if (!centerId) return null;
    return { service_code: VISIT_SERVICE_CODE, center_id: centerId, date };
  }
  if (service?.id == null) return null;
  return { id: String(service.id), date };
}

/** Params for `GET /service/holiday`, same center-vs-service split as above. */
export function buildHolidayQueryParams(input: {
  centerId?: string | null;
  service?: BookingService | null;
  year?: unknown;
  month?: unknown;
}): Record<string, string> | null {
  const { centerId, service, year, month } = input;
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;

  const base = { year: String(y), month: String(m) };
  if (isVisitService(service)) {
    if (!centerId) return null;
    return { ...base, center_id: centerId };
  }
  if (service?.id == null) return null;
  return { ...base, id: String(service.id) };
}

/**
 * Parse a reservation datetime for display. Returns `null` for missing values,
 * zero dates and anything else `Date` cannot represent — an `Invalid Date`
 * reaching `Intl.DateTimeFormat` throws a RangeError and blanks the page.
 */
export type ReservationPostTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Parse a DB wall-clock datetime for display without timezone shifts. */
export function formatReservationPostTime(
  value: unknown
): ReservationPostTime | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("0000")) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(
    trimmed
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  if (hour > 23 || minute > 59 || second > 59) return null;

  return { year, month, day, hour, minute, second };
}

const DISPLAY_TIME_ZONE = "Asia/Tehran";

/**
 * Display parts for a reservation datetime.
 *
 * `reservations.start_time` is a MySQL DATETIME holding Tehran wall-clock time
 * and the API hands it back verbatim ("2026-09-17 13:40:00"), so it must be
 * shown as stored — never shifted by the viewer's UTC offset. Only values that
 * carry an explicit zone (trailing `Z` or `±HH:MM`) are converted to Tehran.
 */
export function reservationDisplayTime(
  value: unknown
): ReservationPostTime | null {
  const zoneless =
    typeof value === "string"
      ? value.trim().replace(/\.\d+$/, "")
      : value;
  const wallClock = formatReservationPostTime(zoneless);
  if (wallClock) return wallClock;

  const parsed = parseReservationDate(value);
  if (!parsed) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(parsed);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(item => item.type === type)?.value);

  const converted = {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second")
  };
  return Object.values(converted).every(Number.isFinite) ? converted : null;
}

export function parseReservationDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("0000")) return null;
  const parsed = new Date(trimmed.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() < 2000) return null;
  return parsed;
}

/** Display title for a reservation, never leaking an unrelated service name. */
export function reservationTitle(input: {
  serviceCode?: string | null;
  serviceName?: string | null;
  serviceLocation?: string | null;
}): string {
  const { serviceCode, serviceName, serviceLocation } = input;
  if (
    typeof serviceCode === "string" &&
    serviceCode.toUpperCase() === VISIT_SERVICE_CODE
  ) {
    return VISIT_BOOKING_HEADING;
  }
  if (serviceName && serviceName.trim()) return serviceName;
  if (serviceLocation === "home") return "درخواست پرستار";
  return "رزرو نوبت";
}
