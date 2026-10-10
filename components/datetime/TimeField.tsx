import * as React from "react";
import {
  buildTime,
  parseTime,
  timeParts,
  toPersianDigits,
  type TimeValue
} from "@/lib/datetime";
import styles from "./TimeField.module.css";

type TimeFieldProps = {
  /** Canonical `"HH:mm"`, or `""` when unset. */
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  label?: string;
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/**
 * Form-field flavour of the standard picker, for panel screens that need a
 * time inside a normal `<label>` layout rather than a wheel dialog.
 *
 * Two selects instead of a free-text box: the previous implementation invited
 * Persian digits via its placeholder ("مثلاً ۰۷:۰۰") and sent whatever the user
 * typed straight to the API. Here the value can only ever be canonical
 * `"HH:mm"` — or `""`, which callers map to `null`.
 */
export default function TimeField({
  value,
  onChange,
  label,
  minuteStep = 5,
  disabled,
  className,
  id
}: TimeFieldProps) {
  // Accept legacy stored values ("7:0", "۰۷:۰۰", "07:00:00") so an existing
  // record opens on the right time instead of appearing blank.
  const canonical = parseTime(value);
  const parts = timeParts(canonical);

  const step = Math.max(1, Math.floor(minuteStep));
  const minuteOptions = React.useMemo(() => {
    const options: number[] = [];
    for (let minute = 0; minute < 60; minute += step) options.push(minute);
    // A stored value off the step grid must still be selectable.
    if (parts && !options.includes(parts.minute)) {
      options.push(parts.minute);
      options.sort((a, b) => a - b);
    }
    return options;
  }, [parts?.minute, step]);

  const hourOptions = React.useMemo(
    () => Array.from({ length: 24 }, (_, hour) => hour),
    []
  );

  const emit = (hour: number | null, minute: number | null) => {
    if (hour == null || minute == null) {
      onChange("");
      return;
    }
    onChange(buildTime(hour, minute));
  };

  const handleHour = (raw: string) => {
    if (raw === "") {
      emit(null, null);
      return;
    }
    emit(Number(raw), parts?.minute ?? 0);
  };

  const handleMinute = (raw: string) => {
    if (raw === "") {
      emit(null, null);
      return;
    }
    emit(parts?.hour ?? 0, Number(raw));
  };

  const pad = (n: number) => toPersianDigits(String(n).padStart(2, "0"));

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
          value={parts ? String(parts.minute) : ""}
          onChange={event => handleMinute(event.target.value)}
          disabled={disabled}
          aria-label="دقیقه"
        >
          <option value="">--</option>
          {minuteOptions.map(minute => (
            <option key={minute} value={minute}>
              {pad(minute)}
            </option>
          ))}
        </select>
        <span className={styles.separator} aria-hidden="true">
          :
        </span>
        <select
          className={styles.select}
          value={parts ? String(parts.hour) : ""}
          onChange={event => handleHour(event.target.value)}
          disabled={disabled}
          aria-label="ساعت"
        >
          <option value="">--</option>
          {hourOptions.map(hour => (
            <option key={hour} value={hour}>
              {pad(hour)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
