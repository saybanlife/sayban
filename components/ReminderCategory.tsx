import * as React from "react";
import {
  PlasmicReminderCategory,
  DefaultReminderCategoryProps
} from "./plasmic/sayban/PlasmicReminderCategory";
import { HTMLElementRefOf } from "@plasmicapp/react-web";

import {
  ADDABLE_REMINDER_TYPES,
  normalizeReminderCategoryCatalog
} from "@/lib/reminderTask";

// re-export for callers that imported ADDABLE from this file historically
export { ADDABLE_REMINDER_TYPES };

export interface ReminderCategoryProps extends DefaultReminderCategoryProps {}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

/**
 * Show every category in the picker. All types are selectable.
 */
export function restrictReminderCategoryData(data: unknown): unknown {
  return normalizeReminderCategoryCatalog(data);
}

function ReminderCategory_(
  props: ReminderCategoryProps,
  ref: HTMLElementRefOf<"div">
) {
  const restrictedData = React.useMemo(
    () => restrictReminderCategoryData(props.data),
    [props.data]
  );

  const firstCategoryName = React.useMemo(() => {
    const root = asRecord(restrictedData);
    const list = Array.isArray(root?.category) ? root!.category : [];
    for (const raw of list) {
      const entry = asRecord(raw);
      const name = String(entry?.name ?? "").trim();
      if (name) return name;
    }
    return undefined;
  }, [restrictedData]);

  return (
    <PlasmicReminderCategory
      root={{ ref }}
      {...props}
      data={restrictedData as DefaultReminderCategoryProps["data"]}
      selected={firstCategoryName || props.selected}
    />
  );
}

const ReminderCategory = React.forwardRef(ReminderCategory_);
export default ReminderCategory;
