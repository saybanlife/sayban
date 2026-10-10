import * as React from "react";
import {
  CARE_DOMAIN_FA_OPTIONS,
  CENTER_TYPE_FA_OPTIONS
} from "../centerPage/centerEnumLocales";
import { useAddCenterAttempted } from "./addCenterValidationStore";
import { getCenterInfoFieldErrors } from "./validateCenterWizard";
import styles from "./CenterTypeFields.module.css";
import PanelOptionSelect from "./PanelOptionSelect";

export type CenterTypeFieldsProps = {
  className?: string;
  /** سالمندان / پرستاری / هر دو */
  careDomain?: string;
  onCareDomainChange?: (value: string) => void;
  /** روزانه / شبانه‌روزی / هر دو */
  centerType?: string;
  onCenterTypeChange?: (value: string) => void;
};

/**
 * The two classification axes of a center, captured while it is being added.
 *
 * `centerType` is what the روزانه/شبانه‌روزی filter on the centers list reads,
 * so it must be set here rather than left for a later profile edit.
 */
export default function CenterTypeFields({
  className,
  careDomain = "",
  onCareDomainChange,
  centerType = "",
  onCenterTypeChange
}: CenterTypeFieldsProps) {
  const attempted = useAddCenterAttempted();
  const errors = getCenterInfoFieldErrors({ careDomain, centerType });
  const careError = attempted ? errors.careDomain : undefined;
  const typeError = attempted ? errors.centerType : undefined;

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <label className={styles.field}>
        <span className={styles.label}>نوع مرکز</span>
        <PanelOptionSelect
          label="نوع مرکز"
          value={careDomain}
          invalid={Boolean(careError)}
          options={CARE_DOMAIN_FA_OPTIONS}
          onChange={next => onCareDomainChange?.(next)}
        />
        {careError ? (
          <span className={styles.error}>{careError}</span>
        ) : (
          <span className={styles.hint}>
            مرکز سالمندان، خدمات پرستاری یا هر دو.
          </span>
        )}
      </label>

      <label className={styles.field}>
        <span className={styles.label}>زمان فعالیت مرکز</span>
        <PanelOptionSelect
          label="زمان فعالیت مرکز"
          value={centerType}
          invalid={Boolean(typeError)}
          options={CENTER_TYPE_FA_OPTIONS}
          onChange={next => onCenterTypeChange?.(next)}
        />
        {typeError ? (
          <span className={styles.error}>{typeError}</span>
        ) : (
          <span className={styles.hint}>
            فیلتر روزانه و شبانه‌روزی در فهرست مراکز بر اساس همین مقدار کار می‌کند.
          </span>
        )}
      </label>
    </div>
  );
}
