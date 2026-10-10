import * as React from "react";
import { parseStaffNoCriminalRecord } from "./staffClearanceStore";
import styles from "./StaffClearanceBadge.module.css";

export function StaffClearanceBadge({
  value,
  className
}: {
  value: unknown;
  className?: string;
}) {
  if (!parseStaffNoCriminalRecord(value)) return null;
  return (
    <span className={[styles.badge, className].filter(Boolean).join(" ")}>
      <span className={styles.dot} aria-hidden />
      عدم سوءپیشینه
    </span>
  );
}
