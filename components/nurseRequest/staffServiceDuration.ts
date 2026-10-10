import type { DurationMode, StaffService } from "./nurseRequestModel";

export type StaffServiceDurationMode = "once" | "continuous";

/** Canonical once/continuous from API/DB (null = legacy / unset). */
export function normalizeStaffServiceDurationMode(
  value: unknown
): StaffServiceDurationMode | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim().toLowerCase();
  if (raw === "once" || raw === "one" || raw === "one_time" || raw === "یکبار" || raw === "یک‌بار") {
    return "once";
  }
  if (
    raw === "continuous" ||
    raw === "ongoing" ||
    raw === "مداوم" ||
    raw === "مستمر"
  ) {
    return "continuous";
  }
  return null;
}

export function staffServiceDurationLabel(
  mode: StaffServiceDurationMode | null | undefined
): string {
  if (mode === "once") return "یک‌بار";
  if (mode === "continuous") return "مداوم";
  return "";
}

/**
 * Keep services matching wizard duration.
 * Legacy rows without duration_mode stay visible (backward compatible).
 */
export function filterServicesByDuration(
  services: StaffService[],
  duration: DurationMode
): StaffService[] {
  if (!duration) return services;
  return services.filter(item => {
    const mode = normalizeStaffServiceDurationMode(
      item.duration_mode ?? item.durationMode
    );
    if (!mode) return true;
    return mode === duration;
  });
}

export function isStaffServiceDurationMode(
  value: unknown
): value is StaffServiceDurationMode {
  return normalizeStaffServiceDurationMode(value) != null;
}
