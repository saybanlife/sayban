import * as React from "react";
import {
  JALALI_MONTH_NAMES,
  fromJalali,
  jalaliMonthLength,
  parseDate,
  toJalali,
  toPersianDigits,
  todayJalali,
  type DateValue
} from "@/lib/datetime";
import styles from "./DateField.module.css";

type DateFieldProps = {
  /** Canonical Gregorian `"YYYY-MM-DD"`, or `""` when unset. */
  value: DateValue;
  onChange: (value: DateValue) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** When true, days before today (Jalali) cannot be selected. */
  disablePastDates?: boolean;
  /** Inclusive lower bound for Jalali year options (default: today−100). */
  minYear?: number;
  /** Inclusive upper bound for Jalali year options (default: today+5). */
  maxYear?: number;
};

/**
 * Non-wheel Jalali date field: year / month / day `<select>`s.
 * Emits canonical Gregorian `"YYYY-MM-DD"` (or `""`).
 */
export default function DateField({
  value,
  onChange,
  label,
  disabled,
  className,
  id,
  disablePastDates = false,
  minYear,
  maxYear
}: DateFieldProps) {
  const today = todayJalali();
  const canonical = parseDate(value);
  const parts = toJalali(canonical);

  const yearMin = minYear ?? today.jy - 100;
  const yearMax = maxYear ?? today.jy + 5;

  const yearOptions = React.useMemo(() => {
    const years: number[] = [];
    for (let year = yearMax; year >= yearMin; year -= 1) years.push(year);
    if (parts && !years.includes(parts.jy)) {
      years.push(parts.jy);
      years.sort((a, b) => b - a);
    }
    return years;
  }, [parts?.jy, yearMax, yearMin]);

  const monthOptions = React.useMemo(
    () => Array.from({ length: 12 }, (_, index) => index + 1),
    []
  );

  const dayCount = parts
    ? jalaliMonthLength(parts.jy, parts.jm)
    : jalaliMonthLength(today.jy, today.jm);

  const dayOptions = React.useMemo(() => {
    const days: number[] = [];
    for (let day = 1; day <= dayCount; day += 1) days.push(day);
    return days;
  }, [dayCount]);

  const isPast = (jy: number, jm: number, jd: number) => {
    if (!disablePastDates) return false;
    if (jy < today.jy) return true;
    if (jy > today.jy) return false;
    if (jm < today.jm) return true;
    if (jm > today.jm) return false;
    return jd < today.jd;
  };

  const emit = (jy: number | null, jm: number | null, jd: number | null) => {
    if (jy == null || jm == null || jd == null) {
      onChange("");
      return;
    }
    const maxDay = jalaliMonthLength(jy, jm);
    const safeDay = Math.min(jd, maxDay);
    if (isPast(jy, jm, safeDay)) return;
    onChange(fromJalali(jy, jm, safeDay));
  };

  const pad = (n: number) => toPersianDigits(String(n));

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      {label ? (
        <span className={styles.label} id={id ? `${id}-label` : undefined}>
          {label}
        </span>
      ) : null}
      <div
        className={styles.controls}
        dir="rtl"
        role="group"
        aria-labelledby={id && label ? `${id}-label` : undefined}
      >

        <select
          className={styles.select}
          value={parts ? String(parts.jd) : ""}
          disabled={disabled}
          aria-label="روز"
          onChange={event => {
            const raw = event.target.value;
            if (raw === "") {
              emit(null, null, null);
              return;
            }
            emit(parts?.jy ?? today.jy, parts?.jm ?? today.jm, Number(raw));
          }}
        >
          <option value="">روز</option>
          {dayOptions.map(day => (
            <option
              key={day}
              value={day}
              disabled={
                parts
                  ? isPast(parts.jy, parts.jm, day)
                  : isPast(today.jy, today.jm, day)
              }
            >
              {pad(day)}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={parts ? String(parts.jm) : ""}
          disabled={disabled}
          aria-label="ماه"
          onChange={event => {
            const raw = event.target.value;
            if (raw === "") {
              emit(null, null, null);
              return;
            }
            emit(parts?.jy ?? today.jy, Number(raw), parts?.jd ?? 1);
          }}
        >
          <option value="">ماه</option>
          {monthOptions.map(month => (
            <option key={month} value={month}>
              {JALALI_MONTH_NAMES[month - 1]}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={parts ? String(parts.jy) : ""}
          disabled={disabled}
          aria-label="سال"
          onChange={event => {
            const raw = event.target.value;
            if (raw === "") {
              emit(null, null, null);
              return;
            }
            emit(Number(raw), parts?.jm ?? today.jm, parts?.jd ?? 1);
          }}
        >
          <option value="">سال</option>
          {yearOptions.map(year => (
            <option key={year} value={year}>
              {pad(year)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
