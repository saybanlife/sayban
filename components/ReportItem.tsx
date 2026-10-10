import * as React from "react";
import {
  PlasmicReportItem,
  DefaultReportItemProps
} from "./plasmic/sayban/PlasmicReportItem";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import ReminderChannelCard from "./ReminderChannelCard";

export interface ReportItemProps extends DefaultReportItemProps {}

function isOn(flag: unknown): boolean {
  return flag === true || flag === "select" || flag === "disable" || flag === "reminder";
}

function ReportItem_(props: ReportItemProps, ref: HTMLElementRefOf<"div">) {
  if (isOn(props.reminder)) {
    const selected = isOn(props.select);
    const disabled = isOn(props.disable);
    return (
      <div ref={ref} className={props.className}>
        <ReminderChannelCard
          master={props.master}
          selected={selected}
          disabled={disabled}
          onToggle={() => {
            if (disabled) return;
            props.onClick?.(undefined as never);
          }}
        />
      </div>
    );
  }

  return <PlasmicReportItem root={{ ref }} {...props} />;
}

const ReportItem = React.forwardRef(ReportItem_);
export default ReportItem;
