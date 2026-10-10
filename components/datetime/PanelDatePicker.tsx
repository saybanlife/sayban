import * as React from "react";
import Modal from "../Modal";
import {
  JALALI_MONTH_NAMES,
  formatJalaliShort,
  fromJalali,
  jalaliMonthLength,
  parseDate,
  toJalali,
  toPersianDigits,
  todayJalali,
  type DateValue
} from "@/lib/datetime";
import styles from "./PanelDatePicker.module.css";

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

type PanelDatePickerProps = {
  value: DateValue;
  onChange: (value: DateValue) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  disablePastDates?: boolean;
  minYear?: number;
  maxYear?: number;
  /** Override trigger text (default: short Jalali). */
  formatDisplay?: (value: DateValue) => string;
  /** Hide calendar / chevron icons (form pill look). */
  showIcons?: boolean;
  /** `form` matches questionnaire short inputs (pill, no icons chrome). */
  appearance?: "default" | "form";
};

function jalaliWeekdayIndex(jy: number, jm: number, jd: number): number {
  // JS: 0=Sun … 6=Sat. Jalali week starts Saturday → Sat=0 … Fri=6.
  const g = fromJalali(jy, jm, jd);
  if (!g) return 0;
  const [y, m, d] = g.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return (day + 1) % 7;
}

function shiftMonth(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  let month = jm + delta;
  let year = jy;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return { jy: year, jm: month };
}

/**
 * Panel-only Jalali date field: trigger opens a calendar modal; Confirm commits.
 */
export default function PanelDatePicker({
  value,
  onChange,
  label,
  placeholder = "تاریخ را انتخاب کنید.",
  disabled,
  className,
  id,
  disablePastDates = false,
  minYear,
  maxYear,
  formatDisplay,
  showIcons = true,
  appearance = "default"
}: PanelDatePickerProps) {
  const today = todayJalali();
  const yearMin = minYear ?? today.jy - 100;
  const yearMax = maxYear ?? today.jy + 20;

  const committed = toJalali(parseDate(value));
  const [open, setOpen] = React.useState(false);
  const [viewJy, setViewJy] = React.useState(committed?.jy ?? today.jy);
  const [viewJm, setViewJm] = React.useState(committed?.jm ?? today.jm);
  const [draftJd, setDraftJd] = React.useState<number | null>(
    committed?.jd ?? null
  );

  React.useEffect(() => {
    if (!open) return;
    const seed = toJalali(parseDate(value)) ?? today;
    setViewJy(seed.jy);
    setViewJm(seed.jm);
    setDraftJd(seed.jd);
  }, [open, value]);

  const close = () => setOpen(false);

  const isPast = (jy: number, jm: number, jd: number) => {
    if (!disablePastDates) return false;
    const candidate = fromJalali(jy, jm, jd);
    if (!candidate) return true;
    const t = fromJalali(today.jy, today.jm, today.jd);
    return Boolean(t && candidate < t);
  };

  const canNavPrev = () => {
    const prev = shiftMonth(viewJy, viewJm, -1);
    return prev.jy > yearMin || (prev.jy === yearMin && prev.jm >= 1);
  };

  const canNavNext = () => {
    const next = shiftMonth(viewJy, viewJm, 1);
    return next.jy < yearMax || (next.jy === yearMax && next.jm <= 12);
  };

  const daysInMonth = jalaliMonthLength(viewJy, viewJm);
  const startPad = jalaliWeekdayIndex(viewJy, viewJm, 1);
  const cells: Array<number | null> = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const display = (formatDisplay || formatJalaliShort)(parseDate(value));
  const monthTitle = `${JALALI_MONTH_NAMES[viewJm - 1]} ${toPersianDigits(viewJy)}`;
  const iconsVisible = appearance === "form" ? false : showIcons;
  const triggerClass =
    appearance === "form"
      ? `${styles.trigger} ${styles.triggerForm}`
      : styles.trigger;

  const confirm = () => {
    if (draftJd == null) return;
    if (isPast(viewJy, viewJm, draftJd)) return;
    onChange(fromJalali(viewJy, viewJm, draftJd));
    close();
  };

  const sheet = (
    <div className={styles.sheet} dir="rtl">
      <header className={styles.header}>
        <h2 className={styles.title}>انتخاب تاریخ</h2>
      </header>

      <div className={styles.monthNav}>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="ماه بعد"
          disabled={!canNavNext()}
          onClick={() => {
            const next = shiftMonth(viewJy, viewJm, 1);
            setViewJy(next.jy);
            setViewJm(next.jm);
            setDraftJd(null);
          }}
        >
          ‹
        </button>
        <div className={styles.monthLabel}>{monthTitle}</div>
        <button
          type="button"
          className={styles.navBtn}
          aria-label="ماه قبل"
          disabled={!canNavPrev()}
          onClick={() => {
            const prev = shiftMonth(viewJy, viewJm, -1);
            setViewJy(prev.jy);
            setViewJm(prev.jm);
            setDraftJd(null);
          }}
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map(day => (
          <span key={day} className={styles.weekday}>
            {day}
          </span>
        ))}
      </div>

      <div className={styles.grid} role="grid">
        {cells.map((day, index) => {
          if (day == null) {
            return <span key={`e-${index}`} className={styles.empty} />;
          }
          const past = isPast(viewJy, viewJm, day);
          const selected = draftJd === day;
          const isToday =
            viewJy === today.jy && viewJm === today.jm && day === today.jd;
          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              disabled={past}
              aria-selected={selected}
              className={[
                styles.day,
                selected ? styles.daySelected : "",
                isToday && !selected ? styles.dayToday : "",
                past ? styles.dayDisabled : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setDraftJd(day)}
            >
              {toPersianDigits(day)}
            </button>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.cancelBtn} onClick={close}>
          لغو
        </button>
        <button
          type="button"
          className={styles.confirmBtn}
          disabled={draftJd == null}
          onClick={confirm}
        >
          تأیید
        </button>
      </footer>
    </div>
  );

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      {label ? (
        <span className={styles.label} id={id ? `${id}-label` : undefined}>
          {label}
        </span>
      ) : null}
      <button
        type="button"
        id={id}
        className={triggerClass}
        disabled={disabled}
        aria-labelledby={id && label ? `${id}-label` : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
      >
        {iconsVisible ? (
          <span className={styles.triggerIcon} aria-hidden="true">
            <CalendarIcon />
          </span>
        ) : null}
        <span
          className={display ? styles.triggerValue : styles.triggerPlaceholder}
        >
          {display || placeholder}
        </span>
        {iconsVisible ? (
          <span className={styles.triggerChevron} aria-hidden="true">
            <ChevronIcon />
          </span>
        ) : null}
      </button>

      <Modal
        isOpen={open}
        onOpenChange={setOpen}
        noTrigger
        heading={null}
        footer={null}
        content={sheet}
      />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 9.5h17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}