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
import styles from "./ReminderCategory.module.css";

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

function normalizeTypeKey(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (key === "medicine" || key === "medicine-time") return "medicine_time";
  if (key === "medical_appointment" || key === "doctor") return "appointment";
  if (key === "gift" || key === "event") return "occasion";
  return key;
}

function ReminderCategory_(
  props: ReminderCategoryProps,
  ref: HTMLElementRefOf<"div">
) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
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

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref]
  );

  // Tag each type tile for icon CSS (ids come from Plasmic category_name).
  React.useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    const paint = () => {
      const sections = root.querySelectorAll<HTMLElement>(
        '[class*="freeBox__fnxV4"], [class*="section"]'
      );
      sections.forEach(section => {
        const fromId = normalizeTypeKey(section.id || "");
        if (fromId) {
          section.setAttribute("data-reminder-type", fromId);
          return;
        }
        const text = (section.textContent || "").replace(/\s+/g, " ").trim();
        if (text.includes("زمان دارو")) {
          section.setAttribute("data-reminder-type", "medicine_time");
        } else if (text.includes("نوبت")) {
          section.setAttribute("data-reminder-type", "appointment");
        } else if (text.includes("مناسبت")) {
          section.setAttribute("data-reminder-type", "occasion");
        }
      });
    };

    paint();
    const mo = new MutationObserver(paint);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [restrictedData]);

  return (
    <div
      ref={setRefs}
      className={styles.host}
      data-reminder-category-picker="1"
    >
      <PlasmicReminderCategory
        {...props}
        data={restrictedData as DefaultReminderCategoryProps["data"]}
        selected={firstCategoryName || props.selected}
      />
    </div>
  );
}

const ReminderCategory = React.forwardRef(ReminderCategory_);
export default ReminderCategory;
