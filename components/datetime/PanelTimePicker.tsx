import * as React from "react";
import Dialog from "../Dialog";
import {
  buildTime,
  parseTime,
  timeParts,
  toPersianDigits,
  type TimeValue
} from "@/lib/datetime";
import styles from "./PanelTimePicker.module.css";

type PanelTimePickerProps = {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  label?: string;
  placeholder?: string;
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
  /**
   * Expand wheels in-flow (no portaled Dialog). Required inside react-aria
   * Modals — nested Radix dialogs lose real mouse/touch to the parent overlay
   * the same way native `<select>` did (see PanelOptionSelect).
   */
  inline?: boolean;
};

/** هوک درگ + اسنپ برای هر ستون ساعت/دقیقه */
function useWheelColumn<T extends number>({
  ref,
  values,
  selected,
  onSelect
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  values: T[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  const isDragging = React.useRef(false);
  const moved = React.useRef(false);
  const startY = React.useRef(0);
  const startScroll = React.useRef(0);
  const scrollTimer = React.useRef<number | undefined>(undefined);
  const itemHeight = React.useRef(40);

  const measure = React.useCallback(() => {
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("[data-value]");
    if (first) itemHeight.current = first.offsetHeight;
  }, [ref]);

  const indexOfClosest = React.useCallback(() => {
    const el = ref.current;
    if (!el) return -1;
    return Math.round(el.scrollTop / itemHeight.current);
  }, [ref]);

  const commit = React.useCallback(
    (smooth = true) => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.min(Math.max(indexOfClosest(), 0), values.length - 1);
      const v = values[idx];
      el.scrollTo({
        top: idx * itemHeight.current,
        behavior: smooth ? "smooth" : "auto"
      });
      if (v !== undefined && v !== selected) onSelect(v);
    },
    [ref, values, selected, onSelect, indexOfClosest]
  );

  const scrollToValue = React.useCallback(
    (v: T, smooth = false) => {
      const el = ref.current;
      if (!el) return;
      measure();
      const idx = values.indexOf(v);
      if (idx < 0) return;
      el.scrollTo({
        top: idx * itemHeight.current,
        behavior: smooth ? "smooth" : "auto"
      });
    },
    [ref, values, measure]
  );

  const onScroll = React.useCallback(() => {
    if (isDragging.current) return;
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => commit(true), 120);
  }, [commit]);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      measure();
      isDragging.current = true;
      moved.current = false;
      startY.current = e.clientY;
      startScroll.current = el.scrollTop;
      el.setPointerCapture(e.pointerId);
      window.clearTimeout(scrollTimer.current);
    },
    [ref, measure]
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || !ref.current) return;
      const delta = e.clientY - startY.current;
      if (Math.abs(delta) > 3) moved.current = true;
      ref.current.scrollTop = startScroll.current - delta;
    },
    [ref]
  );

  const endDrag = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      ref.current?.releasePointerCapture(e.pointerId);
      commit(true);
    },
    [ref, commit]
  );

  const clearMoved = React.useCallback(() => {
    moved.current = false;
  }, []);

  return {
    onScroll,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    scrollToValue,
    wasDragged: () => moved.current,
    clearMoved
  };
}

export default function PanelTimePicker({
  value,
  onChange,
  label,
  placeholder = "ساعت را انتخاب کنید",
  minuteStep = 5,
  disabled,
  className,
  id,
  inline = false
}: PanelTimePickerProps) {
  const canonical = parseTime(value);
  const parts = timeParts(canonical);

  const [open, setOpen] = React.useState(false);
  const [draftHour, setDraftHour] = React.useState(parts?.hour ?? 9);
  const [draftMinute, setDraftMinute] = React.useState(parts?.minute ?? 0);

  const step = Math.max(1, Math.floor(minuteStep));
  const minuteOptions = React.useMemo(() => {
    const options: number[] = [];
    for (let minute = 0; minute < 60; minute += step) options.push(minute);
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

  const hourRef = React.useRef<HTMLDivElement>(null);
  const minuteRef = React.useRef<HTMLDivElement>(null);

  const hourWheel = useWheelColumn({
    ref: hourRef,
    values: hourOptions,
    selected: draftHour,
    onSelect: setDraftHour
  });
  const minuteWheel = useWheelColumn({
    ref: minuteRef,
    values: minuteOptions,
    selected: draftMinute,
    onSelect: setDraftMinute
  });

  React.useEffect(() => {
    if (!open) return;
    const next = timeParts(parseTime(value));
    const hour = next?.hour ?? 9;
    const minute = next?.minute ?? 0;
    setDraftHour(hour);
    setDraftMinute(minute);
    const timer = window.setTimeout(() => {
      hourWheel.scrollToValue(hour, false);
      minuteWheel.scrollToValue(minute, false);
    }, 40);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  const close = () => setOpen(false);

  const triggerText = parts
    ? `${toPersianDigits(String(parts.hour).padStart(2, "0"))}:${toPersianDigits(
        String(parts.minute).padStart(2, "0")
      )}`
    : "";

  const confirm = () => {
    onChange(buildTime(draftHour, draftMinute));
    close();
  };

  const pad = (n: number) => toPersianDigits(String(n).padStart(2, "0"));

  const pickMinute = (minute: number) => {
    minuteWheel.clearMoved();
    setDraftMinute(minute);
    minuteWheel.scrollToValue(minute, true);
  };

  const pickHour = (hour: number) => {
    hourWheel.clearMoved();
    setDraftHour(hour);
    hourWheel.scrollToValue(hour, true);
  };

  const sheet = (
    <div
      className={inline ? `${styles.sheet} ${styles.sheetInline}` : styles.sheet}
      dir="rtl"
      data-time-picker-sheet={inline ? "inline" : "dialog"}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>انتخاب ساعت</h2>
      </header>

      <div className={styles.wheels} aria-label="انتخاب ساعت">
        <div className={styles.highlight} aria-hidden="true" />
        <div
          className={styles.column}
          ref={minuteRef}
          role="listbox"
          aria-label="دقیقه"
          onScroll={minuteWheel.onScroll}
          onPointerDown={minuteWheel.onPointerDown}
          onPointerMove={minuteWheel.onPointerMove}
          onPointerUp={minuteWheel.onPointerUp}
          onPointerCancel={minuteWheel.onPointerCancel}
        >
          {minuteOptions.map(minute => (
            <button
              key={minute}
              type="button"
              role="option"
              data-value={minute}
              aria-selected={minute === draftMinute}
              className={[
                styles.item,
                minute === draftMinute ? styles.itemSelected : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                // اگر کاربر واقعاً درگ کرده (بیش از ۳px جابه‌جایی)، این کلیک
                // نتیجه‌ی رهاسازی درگ روی یک آیتمه، نه یک تپ/کلیک واقعی —
                // پس نادیده گرفته می‌شه تا مقدار اشتباه ست نشه.
                if (minuteWheel.wasDragged()) {
                  minuteWheel.clearMoved();
                  return;
                }
                pickMinute(minute);
              }}
            >
              {pad(minute)}
            </button>
          ))}
        </div>
        <span className={styles.colon} aria-hidden="true">
          :
        </span>
        <div
          className={styles.column}
          ref={hourRef}
          role="listbox"
          aria-label="ساعت"
          onScroll={hourWheel.onScroll}
          onPointerDown={hourWheel.onPointerDown}
          onPointerMove={hourWheel.onPointerMove}
          onPointerUp={hourWheel.onPointerUp}
          onPointerCancel={hourWheel.onPointerCancel}
        >
          {hourOptions.map(hour => (
            <button
              key={hour}
              type="button"
              role="option"
              data-value={hour}
              aria-selected={hour === draftHour}
              className={[
                styles.item,
                hour === draftHour ? styles.itemSelected : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (hourWheel.wasDragged()) {
                  hourWheel.clearMoved();
                  return;
                }
                pickHour(hour);
              }}
            >
              {pad(hour)}
            </button>
          ))}
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.cancelBtn} onClick={close}>
          لغو
        </button>
        <button type="button" className={styles.confirmBtn} onClick={confirm}>
          تأیید
        </button>
      </footer>
    </div>
  );

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-time-picker-inline={inline ? "1" : undefined}
    >
      {label ? (
        <span className={styles.label} id={id ? `${id}-label` : undefined}>
          {label}
        </span>
      ) : null}
      <button
        type="button"
        id={id}
        className={styles.trigger}
        disabled={disabled}
        aria-labelledby={id && label ? `${id}-label` : undefined}
        aria-haspopup={inline ? "listbox" : "dialog"}
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen(current => !current);
        }}
      >
        <span className={styles.triggerIcon} aria-hidden="true">
          <ClockIcon />
        </span>
        <span
          className={
            triggerText ? styles.triggerValue : styles.triggerPlaceholder
          }
        >
          {triggerText || placeholder}
        </span>
        <span className={styles.triggerChevron} aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>

      {inline ? (
        open ? sheet : null
      ) : (
        <Dialog
          opendialog={open}
          onOpendialogChange={next => {
            const nextOpen = typeof next === "boolean" ? next : Boolean(next);
            setOpen(nextOpen);
          }}
          disableOpenAutoFocus
          disableModalHash
          colorback="w"
        >
          {sheet}
        </Dialog>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
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