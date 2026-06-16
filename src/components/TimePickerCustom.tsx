import React, { useState, useEffect, useRef } from "react";
import TimeKeeper from "react-timekeeper";
import { CodeComponentMeta } from "@plasmicapp/host";

type TimePickerProps = {
  selectedValues?: { hour: number; minute: number; date: Date }; // ✅ now actually supported
  onChange?: (values: { hour: number; minute: number; date: Date }) => void;
  SelectedHour?: number;
  SelectedMinute?: number;
  className?: string;
};

export const TimePickerCustom = ({
  selectedValues,
  onChange,
  SelectedHour = 9,
  SelectedMinute = 30,
  className,
}: TimePickerProps) => {
  // If selectedValues exists, use it as initial; otherwise use SelectedHour/Minute
  const initialTime =
    selectedValues?.hour !== undefined && selectedValues?.minute !== undefined
      ? `${selectedValues.hour}:${selectedValues.minute.toString().padStart(2, "0")}`
      : `${SelectedHour}:${SelectedMinute.toString().padStart(2, "0")}`;

  const [time, setTime] = useState(initialTime);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

    // Notify parent of changes
    if (onChangeRef.current) {
      onChangeRef.current({ hour: h, minute: m, date });
    }
  }, [time]);

  return (
    <div className={className}>
      <TimeKeeper
        time={time}
        onChange={(newTime) => setTime(newTime.formatted24)}
        switchToMinuteOnHourSelect
        hour24Mode 
      />
    </div>
  );
};

export const TimePickerCustomMeta: CodeComponentMeta<TimePickerProps> = {
  name: "TimePickerCustom",
  importPath: "@/components/TimePickerCustom",
  props: {
    onChange: {
      type: "eventHandler",
      argTypes: [{ name: "selectedValues", type: "object" }],
      description: "Callback when selected time changes.",
    },
    selectedValues: { // ✅ Register it here
      type: "object",
      description: "Current selected time values.",
    },
    SelectedHour: {
      type: "number",
      defaultValue: 9,
    },
    SelectedMinute: {
      type: "number",
      defaultValue: 30,
    },
  },
  states: {
    value: {
      type: "writable",
      variableType: "object",
      valueProp: "selectedValues",
      onChangeProp: "onChange",
    },
  },
};
