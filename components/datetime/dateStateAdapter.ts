/**
 * Bridge between the canonical `DateValue` the picker emits and the loose
 * `{day, month, year, gregorian}` object the Plasmic screens already read.
 *
 * Existing consumers (`PlasmicEditUser`, `PlasmicLogin`, `PlasmicReservationItem`,
 * …) destructure `$state.date.gregorian.*`, so `DateInput` keeps publishing that
 * shape. The important addition is `text`: a pre-padded `"YYYY-MM-DD"` that
 * screens should use instead of re-assembling the parts themselves, which is
 * where `"2026-3-7"` came from.
 */

import {
  buildDate,
  isValidDate,
  parseDate,
  toJalali,
  type DateValue
} from "@/lib/datetime";

export type DateInputState = {
  /** Jalali day. */
  day: number;
  /** Jalali month, 1-based. */
  month: number;
  /** Jalali year. */
  year: number;
  gregorian: { day: number; month: number; year: number };
  /** Canonical Gregorian `"YYYY-MM-DD"`. Prefer this over the parts. */
  text: DateValue;
};

/** Canonical `DateValue` → the object shape `$state.date` exposes. */
export function dateValueToState(raw: unknown): DateInputState | {} {
  const value = parseDate(raw);
  const jalali = toJalali(value);
  if (!value || !jalali) return {};
  const [year, month, day] = value.split("-").map(Number);
  return {
    day: jalali.jd,
    month: jalali.jm,
    year: jalali.jy,
    gregorian: { day, month, year },
    text: value
  };
}

/**
 * `$state.date` (any historical shape) → canonical `DateValue`.
 *
 * Handles: the canonical `text` field, a bare string, and the older
 * `{gregorian: {year, month, day}}` object written before this change.
 */
export function dateStateToValue(raw: unknown): DateValue {
  if (!raw) return "";
  if (typeof raw === "string") return parseDate(raw);
  if (typeof raw !== "object") return "";

  const state = raw as Partial<DateInputState>;
  if (isValidDate(state.text)) return state.text;

  const gregorian = state.gregorian;
  if (gregorian) {
    return buildDate(gregorian.year, gregorian.month, gregorian.day);
  }
  return "";
}
