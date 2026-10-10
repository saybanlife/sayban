import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Picker from "rmc-picker";
import { CodeComponentMeta } from "@plasmicapp/host";
import { classNames } from "@plasmicapp/react-web";
import "rmc-picker/assets/index.css";
import wheelStyles from "./pickerWheels.module.css";
import {
  JALALI_MONTH_NAMES,
  buildTime,
  fromJalali,
  isValidDate,
  isValidTime,
  jalaliMonthLength,
  parseDate,
  parseTime,
  timeParts,
  toJalali,
  toPersianDigits,
  todayJalali,
  type DateValue,
  type TimeValue
} from "@/lib/datetime";

export type DateTimePickerMode = "date" | "time" | "datetime";

export type DateTimePickerProps = {
  mode?: DateTimePickerMode;
  /** Canonical `"YYYY-MM-DD"` (Gregorian). Ignored when mode is `"time"`. */
  date?: DateValue;
  onDateChange?: (value: DateValue) => void;
  /** Canonical `"HH:mm"` (24h). Ignored when mode is `"date"`. */
  time?: TimeValue;
  onTimeChange?: (value: TimeValue) => void;
  /** Blocks days before today. */
  disablePastDates?: boolean;
  /** Hides the year wheel for recurring dates (birthdays, anniversaries). */
  hideYear?: boolean;
  /** Earliest selectable Jalali year. Defaults to 1300, or today when past dates are blocked. */
  minJalaliYear?: number;
  /** Latest selectable Jalali year. Defaults to today, or today + 20 when past dates are blocked. */
  maxJalaliYear?: number;
  /** Minute granularity of the minute wheel. */
  minuteStep?: number;
  className?: string;
};

const PICKER_ROW_HEIGHT = 34;

const pickerIndicatorStyle: React.CSSProperties = {
  height: PICKER_ROW_HEIGHT,
  boxSizing: "border-box"
};

const pickerItemStyle: React.CSSProperties = {
  height: PICKER_ROW_HEIGHT,
  lineHeight: 0,
  padding: 0,
  margin: 0,
  boxSizing: "border-box",
  position: "relative",
  overflow: "hidden"
};

type Option = { value: number; label: string };

function numberOptions(from: number, to: number, step = 1): Option[] {
  const options: Option[] = [];
  for (let value = from; value <= to; value += step) {
    options.push({ value, label: toPersianDigits(String(value).padStart(2, "0")) });
  }
  return options;
}

/**
 * rmc-picker reads indicator getBoundingClientRect().height in
 * componentDidMount. Radix/Plasmic dialog open animation (plsmc-enter ~0.5s)
 * applies a transform, so that measurement is scaled (e.g. 32.3 instead of 34)
 * and every selected index drifts off the indicator band. Wait until the host
 * dialog is layout-stable before mounting the native picker.
 */
function useStablePickerMount(hostRef: React.RefObject<HTMLElement | null>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId = 0;
    let fallbackId = 0;

    const isDialogStable = (dialog: HTMLElement) => {
      const running = (dialog.getAnimations?.() ?? []).some(
        anim => anim.playState === "running"
      );
      if (running) return false;
      const transform = getComputedStyle(dialog).transform;
      return !transform || transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)";
    };

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    const tryReady = () => {
      if (cancelled) return true;
      const host = hostRef.current;
      if (!host) return false;
      const dialog = host.closest('[role="dialog"]') as HTMLElement | null;
      if (!dialog || isDialogStable(dialog)) {
        markReady();
        return true;
      }
      return false;
    };

    if (tryReady()) return;

    intervalId = window.setInterval(() => {
      if (tryReady()) {
        window.clearInterval(intervalId);
        window.clearTimeout(fallbackId);
      }
    }, 32);
    fallbackId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      markReady();
    }, 700);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(fallbackId);
    };
  }, [hostRef]);

  return ready;
}

function Wheel({
  options,
  value,
  onChange,
  className
}: {
  options: Option[];
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ready = useStablePickerMount(hostRef);

  return (
    <div
      ref={hostRef}
      className={classNames(wheelStyles.column, className)}
      style={{ height: PICKER_ROW_HEIGHT * 7 }}
    >
      {ready ? (
        <Picker
          selectedValue={value}
          onValueChange={next => onChange(Number(next))}
          itemStyle={pickerItemStyle}
          indicatorStyle={pickerIndicatorStyle}
        >
          {options.map(option => (
            <Picker.Item key={option.value} value={option.value}>
              <span className={wheelStyles.label}>{option.label}</span>
            </Picker.Item>
          ))}
        </Picker>
      ) : null}
    </div>
  );
}

/**
 * The project's single date/time picker.
 *
 * Unlike the pickers it replaces, this one emits **canonical strings**
 * (`"YYYY-MM-DD"` / `"HH:mm"`) rather than loose numbers, so no consumer has to
 * pad, convert or guess. Jalali is presentation only: the wheels show Persian
 * months and digits while the value stays Gregorian ASCII.
 *
 * It never emits a partially valid value — an out-of-range day is clamped to a
 * real one before `onDateChange` fires, so `"1404-12-30"` in a non-leap year
 * cannot escape the component.
 */
export function DateTimePicker({
  mode = "date",
  date = "",
  onDateChange,
  time = "",
  onTimeChange,
  disablePastDates = false,
  hideYear = false,
  minJalaliYear,
  maxJalaliYear,
  minuteStep = 1,
  className
}: DateTimePickerProps) {
  const showDate = mode === "date" || mode === "datetime";
  const showTime = mode === "time" || mode === "datetime";

  const todayJ = useMemo(() => todayJalali(), []);

  // Seed from the incoming value; fall back to today so the wheels never open
  // on an arbitrary hardcoded date.
  const initialJalali = useMemo(() => {
    const parsed = toJalali(parseDate(date));
    return parsed ?? todayJ;
  }, [date, todayJ]);

  const [jy, setJy] = useState(initialJalali.jy);
  const [jm, setJm] = useState(initialJalali.jm);
  const [jd, setJd] = useState(initialJalali.jd);

  const initialTime = useMemo(() => {
    const parsed = timeParts(parseTime(time));
    return parsed ?? { hour: 9, minute: 0 };
  }, [time]);

  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);

  // Adopt external value changes (dialog reopened on a different record)
  // without fighting the user mid-scroll: only when it differs from what we
  // would emit ourselves.
  const emittedDate = useRef("");
  const emittedTime = useRef("");

  useEffect(() => {
    const incoming = parseDate(date);
    if (!incoming || incoming === emittedDate.current) return;
    const parsed = toJalali(incoming);
    if (!parsed) return;
    setJy(parsed.jy);
    setJm(parsed.jm);
    setJd(parsed.jd);
  }, [date]);

  useEffect(() => {
    const incoming = parseTime(time);
    if (!incoming || incoming === emittedTime.current) return;
    const parsed = timeParts(incoming);
    if (!parsed) return;
    setHour(parsed.hour);
    setMinute(parsed.minute);
  }, [time]);

  const years = useMemo<Option[]>(() => {
    const first = minJalaliYear ?? (disablePastDates ? todayJ.jy : 1300);
    const last = maxJalaliYear ?? (disablePastDates ? todayJ.jy + 20 : todayJ.jy);
    const options: Option[] = [];
    for (let year = first; year <= last; year += 1) {
      options.push({ value: year, label: toPersianDigits(year) });
    }
    return options.length ? options : [{ value: todayJ.jy, label: toPersianDigits(todayJ.jy) }];
  }, [disablePastDates, maxJalaliYear, minJalaliYear, todayJ.jy]);

  const months = useMemo<Option[]>(() => {
    const all = JALALI_MONTH_NAMES.map((label, index) => ({
      value: index + 1,
      label
    }));
    if (disablePastDates && jy === todayJ.jy) {
      return all.filter(month => month.value >= todayJ.jm);
    }
    return all;
  }, [disablePastDates, jy, todayJ.jm, todayJ.jy]);

  // Recomputed from the *current* month, so 31-day months, 30-day months and
  // the 29/30 Esfand leap case are all handled by one source of truth.
  const days = useMemo<Option[]>(() => {
    const length = jalaliMonthLength(jy, jm);
    const first =
      disablePastDates && jy === todayJ.jy && jm === todayJ.jm ? todayJ.jd : 1;
    const options: Option[] = [];
    for (let day = first; day <= length; day += 1) {
      options.push({ value: day, label: toPersianDigits(day) });
    }
    return options;
  }, [disablePastDates, jd, jm, jy, todayJ.jd, todayJ.jm, todayJ.jy]);

  // Clamp before emitting rather than after, so a consumer never observes a
  // day that does not exist in the selected month.
  const safeJm = months.some(m => m.value === jm) ? jm : months[0]?.value ?? 1;
  const safeJd = days.some(d => d.value === jd) ? jd : days[0]?.value ?? 1;

  const hours = useMemo(() => numberOptions(0, 23), []);
  const minutes = useMemo(
    () => numberOptions(0, 59, Math.max(1, Math.floor(minuteStep))),
    [minuteStep]
  );
  const safeMinute = minutes.some(m => m.value === minute)
    ? minute
    : minutes[0]?.value ?? 0;

  const onDateChangeRef = useRef(onDateChange);
  const onTimeChangeRef = useRef(onTimeChange);
  useEffect(() => {
    onDateChangeRef.current = onDateChange;
    onTimeChangeRef.current = onTimeChange;
  });

  useEffect(() => {
    if (!showDate) return;
    const next = fromJalali(jy, safeJm, safeJd);
    if (!isValidDate(next) || next === emittedDate.current) return;
    emittedDate.current = next;
    onDateChangeRef.current?.(next);
  }, [jy, safeJd, safeJm, showDate]);

  useEffect(() => {
    if (!showTime) return;
    const next = buildTime(hour, safeMinute);
    if (!isValidTime(next) || next === emittedTime.current) return;
    emittedTime.current = next;
    onTimeChangeRef.current?.(next);
  }, [hour, safeMinute, showTime]);

  const handleYear = useCallback((value: number) => setJy(value), []);
  const handleMonth = useCallback((value: number) => setJm(value), []);
  const handleDay = useCallback((value: number) => setJd(value), []);
  const handleHour = useCallback((value: number) => setHour(value), []);
  const handleMinute = useCallback((value: number) => setMinute(value), []);

  return (
    <div className={classNames(wheelStyles.root, className)} dir="rtl">
      {showTime ? (
        <div className={wheelStyles.section}>
          <div className={wheelStyles.columnLabelroot}>
            <div className={wheelStyles.columnLabel}>دقیقه</div>
            <div className={wheelStyles.columnLabel}>ساعت</div>
          </div>
          <div className={wheelStyles.wheelsRow}>
            <Wheel
              options={minutes}
              value={safeMinute}
              onChange={handleMinute}
            />
            <Wheel options={hours} value={hour} onChange={handleHour} />
          </div>
        </div>
      ) : null}
      {showDate ? (
        <div className={wheelStyles.section}>
          <div className={wheelStyles.columnLabelroot}>
            <div className={wheelStyles.columnLabel}>روز</div>
            <div className={wheelStyles.columnLabel}>ماه</div>
            {hideYear ? null : (
              <div className={wheelStyles.columnLabel}>سال</div>
            )}
          </div>
          <div className={wheelStyles.wheelsRow}>
            <Wheel options={days} value={safeJd} onChange={handleDay} />
            <Wheel
              options={months}
              value={safeJm}
              onChange={handleMonth}
              className={wheelStyles.columnMonth}
            />
            {hideYear ? null : (
              <Wheel options={years} value={jy} onChange={handleYear} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const DateTimePickerMeta: CodeComponentMeta<DateTimePickerProps> = {
  name: "DateTimePicker",
  importPath: "@/components/DateTimePicker",
  props: {
    mode: {
      type: "choice",
      options: ["date", "time", "datetime"],
      defaultValue: "date",
      description: "انتخاب تاریخ، ساعت یا هر دو."
    },
    date: {
      type: "string",
      defaultValue: "",
      description: "مقدار میلادی به شکل YYYY-MM-DD."
    },
    onDateChange: {
      type: "eventHandler",
      argTypes: [{ name: "value", type: "string" }]
    },
    time: {
      type: "string",
      defaultValue: "",
      description: "مقدار ۲۴ساعته به شکل HH:mm."
    },
    onTimeChange: {
      type: "eventHandler",
      argTypes: [{ name: "value", type: "string" }]
    },
    disablePastDates: {
      type: "boolean",
      defaultValue: false,
      description: "اگر true باشد، تاریخ‌های گذشته قابل انتخاب نیستند."
    },
    hideYear: {
      type: "boolean",
      defaultValue: false,
      description: "اگر true باشد، انتخابگر سال نمایش داده نمی‌شود."
    },
    minJalaliYear: { type: "number" },
    maxJalaliYear: { type: "number" },
    minuteStep: { type: "number", defaultValue: 1 }
  },
  states: {
    date: {
      type: "writable",
      variableType: "text",
      valueProp: "date",
      onChangeProp: "onDateChange"
    },
    time: {
      type: "writable",
      variableType: "text",
      valueProp: "time",
      onChangeProp: "onTimeChange"
    }
  }
};

export default DateTimePicker;
