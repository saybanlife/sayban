import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Picker from "rmc-picker";
import { CodeComponentMeta } from "@plasmicapp/host";
import { classNames } from "@plasmicapp/react-web";
import "rmc-picker/assets/index.css";
import wheelStyles from "./pickerWheels.module.css";

/**
 * Wheel-based time picker that matches DatePickers UI/alignment.
 * Independent copy of TimePickerCustom — same selection contract
 * ({ hour, minute, date }), different visual (rmc-picker columns).
 * Do not edit the original TimePickerCustom.
 */
type TimePickersProps = {
  selectedValues?: { hour: number; minute: number; date: Date };
  onChange?: (values: { hour: number; minute: number; date: Date }) => void;
  SelectedHour?: number;
  SelectedMinute?: number;
  className?: string;
};

const toPersianDigits = (num: number | string): string => {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return num
    .toString()
    .replace(/\d/g, digit => persianDigits[parseInt(digit, 10)]);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const resolveHour = (
  selectedValues: TimePickersProps["selectedValues"],
  SelectedHour: number
) => {
  if (
    selectedValues?.hour !== undefined &&
    Number.isFinite(selectedValues.hour)
  ) {
    return clamp(Math.trunc(selectedValues.hour), 0, 23);
  }
  return clamp(Math.trunc(SelectedHour), 0, 23);
};

const resolveMinute = (
  selectedValues: TimePickersProps["selectedValues"],
  SelectedMinute: number
) => {
  if (
    selectedValues?.minute !== undefined &&
    Number.isFinite(selectedValues.minute)
  ) {
    return clamp(Math.trunc(selectedValues.minute), 0, 59);
  }
  return clamp(Math.trunc(SelectedMinute), 0, 59);
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

export const TimePickers = ({
  selectedValues,
  onChange,
  SelectedHour = 9,
  SelectedMinute = 30,
  className
}: TimePickersProps) => {
  const [selectedHour, setSelectedHour] = useState(() =>
    resolveHour(selectedValues, SelectedHour)
  );
  const [selectedMinute, setSelectedMinute] = useState(() =>
    resolveMinute(selectedValues, SelectedMinute)
  );

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep wheels aligned with incoming Selected* props (same pattern as DatePickers).
  useEffect(() => {
    const nextHour = clamp(Math.trunc(SelectedHour), 0, 23);
    const nextMinute = clamp(Math.trunc(SelectedMinute), 0, 59);
    setSelectedHour(prev => (prev === nextHour ? prev : nextHour));
    setSelectedMinute(prev => (prev === nextMinute ? prev : nextMinute));
  }, [SelectedHour, SelectedMinute]);

  useEffect(() => {
    const now = new Date();
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      selectedHour,
      selectedMinute
    );

    if (onChangeRef.current) {
      onChangeRef.current({
        hour: selectedHour,
        minute: selectedMinute,
        date
      });
    }
  }, [selectedHour, selectedMinute]);

  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        value: hour,
        label: toPersianDigits(hour.toString().padStart(2, "0"))
      })),
    []
  );

  const minutes = useMemo(
    () =>
      Array.from({ length: 60 }, (_, minute) => ({
        value: minute,
        label: toPersianDigits(minute.toString().padStart(2, "0"))
      })),
    []
  );

  const handleChangeHour = useCallback((value: string | number) => {
    const next = clamp(Number(value), 0, 23);
    setSelectedHour(prev => (prev === next ? prev : next));
  }, []);

  const handleChangeMinute = useCallback((value: string | number) => {
    const next = clamp(Number(value), 0, 59);
    setSelectedMinute(prev => (prev === next ? prev : next));
  }, []);

  return (
    <div className={classNames(wheelStyles.root, className)} dir="rtl">
      {/* RTL: first column on the right — hour then minute (HH:MM) */}
      <div className={wheelStyles.column}>
        <div className={wheelStyles.columnLabel}>ساعت</div>
        <Picker
          selectedValue={selectedHour}
          onValueChange={handleChangeHour}
          itemStyle={pickerItemStyle}
          indicatorStyle={pickerIndicatorStyle}
        >
          {hours.map(hour => (
            <Picker.Item key={hour.value} value={hour.value}>
              <span className={wheelStyles.label}>{hour.label}</span>
            </Picker.Item>
          ))}
        </Picker>
      </div>

      <div
        className={wheelStyles.separator}
        style={{
          marginTop: 24,
          height: PICKER_ROW_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        :
      </div>

      <div className={wheelStyles.column}>
        <div className={wheelStyles.columnLabel}>دقیقه</div>
        <Picker
          selectedValue={selectedMinute}
          onValueChange={handleChangeMinute}
          itemStyle={pickerItemStyle}
          indicatorStyle={pickerIndicatorStyle}
        >
          {minutes.map(minute => (
            <Picker.Item key={minute.value} value={minute.value}>
              <span className={wheelStyles.label}>{minute.label}</span>
            </Picker.Item>
          ))}
        </Picker>
      </div>
    </div>
  );
};

export const TimePickersMeta: CodeComponentMeta<TimePickersProps> = {
  name: "TimePickers",
  importPath: "@/components/TimePickers",
  props: {
    onChange: {
      type: "eventHandler",
      argTypes: [{ name: "selectedValues", type: "object" }],
      description: "Callback when selected time changes."
    },
    selectedValues: {
      type: "object",
      description: "Current selected time values."
    },
    SelectedHour: {
      type: "number",
      defaultValue: 9
    },
    SelectedMinute: {
      type: "number",
      defaultValue: 30
    }
  },
  states: {
    value: {
      type: "writable",
      variableType: "object",
      valueProp: "selectedValues",
      onChangeProp: "onChange"
    }
  }
};
