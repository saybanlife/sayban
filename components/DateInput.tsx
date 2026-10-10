import * as React from "react";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  PlasmicDateInput,
  DefaultDateInputProps
} from "./plasmic/sayban/PlasmicDateInput";
import PanelDatePicker from "./datetime/PanelDatePicker";
import { useIsPanelRoute } from "./datetime/useIsPanelRoute";
import {
  dateStateToValue,
  dateValueToState
} from "./datetime/dateStateAdapter";
import styles from "./SimplePickerFields.module.css";

export interface DateInputProps extends DefaultDateInputProps {}

/**
 * Public/home: original Plasmic dialog + DateTimePicker wheels.
 * Panel: calendar dialog matching the panel design reference.
 */
function DateInput_(props: DateInputProps, ref: HTMLElementRefOf<"div">) {
  const isPanel = useIsPanelRoute();
  const { date, onDateChange, className, userInfo } = props;
  const disablePastDates = !(userInfo === true || userInfo === "userInfo");

  if (!isPanel) {
    return (
      <PlasmicDateInput
        root={{ ref }}
        dialog={{ props: { disableModalHash: true } }}
        {...props}
      />
    );
  }

  return (
    <div
      ref={ref}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-sayban-date-field="panel"
    >
      <PanelDatePicker
        value={dateStateToValue(date)}
        disablePastDates={disablePastDates}
        onChange={next => {
          onDateChange?.(dateValueToState(next) as never);
        }}
      />
    </div>
  );
}

const DateInput = React.forwardRef(DateInput_);
export default DateInput;
