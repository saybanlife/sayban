import * as React from "react";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  PlasmicTimeInput,
  DefaultTimeInputProps
} from "./plasmic/sayban/PlasmicTimeInput";
import PanelTimePicker from "./datetime/PanelTimePicker";
import { useIsPanelRoute } from "./datetime/useIsPanelRoute";
import { parseTime, timeValueToState } from "@/lib/datetime";
import styles from "./SimplePickerFields.module.css";

export interface TimeInputProps extends DefaultTimeInputProps {}

/**
 * Public/home: original Plasmic dialog + DateTimePicker wheels.
 * Panel: hour/minute dialog matching the panel design reference.
 *
 * `onChange` publishes `{hour, minute, text}` (same as public TimeInput),
 * not a bare `"HH:mm"` string — screens still read `.hour` / `.minute`.
 */
function TimeInput_(props: TimeInputProps, ref: HTMLElementRefOf<"div">) {
  const isPanel = useIsPanelRoute();
  const { time, onTimeChange, children, className, label } = props;

  if (!isPanel) {
    return (
      <PlasmicTimeInput
        root={{ ref }}
        dialog={{ props: { disableModalHash: true } }}
        {...props}
      />
    );
  }

  const labelText =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : label
        ? "ساعت"
        : undefined;

  return (
    <div
      ref={ref}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-sayban-time-field="panel"
    >
      <PanelTimePicker
        value={parseTime(time)}
        onChange={next => {
          onTimeChange?.(timeValueToState(next) as never);
        }}
        label={labelText}
      />
    </div>
  );
}

const TimeInput = React.forwardRef(TimeInput_);
export default TimeInput;
