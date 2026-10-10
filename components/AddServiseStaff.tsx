import * as React from "react";
import {
  PlasmicAddServiseStaff,
  DefaultAddServiseStaffProps
} from "./plasmic/sayban/PlasmicAddServiseStaff";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import type { StaffServiceDurationMode } from "./nurseRequest/staffServiceDuration";
import {
  normalizeStaffServiceDurationMode,
  staffServiceDurationLabel
} from "./nurseRequest/staffServiceDuration";
import styles from "./AddServiseStaffDuration.module.css";

export interface AddServiseStaffProps extends DefaultAddServiseStaffProps {}

function durationFromServises(servises: unknown): StaffServiceDurationMode | null {
  if (!servises || typeof servises !== "object") return null;
  return normalizeStaffServiceDurationMode(
    (servises as { duration_mode?: unknown }).duration_mode
  );
}

function AddServiseStaff_(
  props: AddServiseStaffProps,
  ref: HTMLElementRefOf<"div">
) {
  const { servises, onServisesChange, staff, ...rest } = props;
  const currentMode = durationFromServises(servises);

  const setMode = (mode: StaffServiceDurationMode | null) => {
    const base =
      servises && typeof servises === "object" && !Array.isArray(servises)
        ? { ...(servises as Record<string, unknown>) }
        : {};
    onServisesChange?.({
      ...base,
      duration_mode: mode
    } as any);
  };

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={styles.wrap}>
      <PlasmicAddServiseStaff
        {...rest}
        staff={staff}
        servises={servises}
        onServisesChange={onServisesChange}
      />
      {staff ? (
        <div className={styles.durationBlock}>
          <div className={styles.durationLabel}>نوع ارائه خدمت</div>
          <div className={styles.modes} role="group" aria-label="نوع ارائه خدمت">
            {(
              [
                [null, "هر دو (پیش‌فرض)"],
                ["once", "یک‌بار"],
                ["continuous", "مداوم"]
              ] as const
            ).map(([value, label]) => {
              const selected =
                (value === null && currentMode == null) ||
                currentMode === value;
              return (
                <button
                  key={String(value)}
                  type="button"
                  className={selected ? styles.modeOn : styles.mode}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {currentMode ? (
            <p className={styles.hint}>
              در درخواست مراقب/پرستار فقط وقتی کاربر «
              {staffServiceDurationLabel(currentMode)}» را انتخاب کند این خدمت
              دیده می‌شود.
            </p>
          ) : (
            <p className={styles.hint}>
              اگر خالی بماند، خدمت مثل قبل در هر دو حالت یک‌بار و مداوم نمایش
              داده می‌شود.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

const AddServiseStaff = React.forwardRef(AddServiseStaff_);
export default AddServiseStaff;
