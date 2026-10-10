/**
 * Nurse-staffing visibility for panel sidebar / routes.
 *
 * «مدیریت پرستاران» is only for centers whose care_domain is nursing or both
 * (پرستاری / پرستاری + سالمندان). Elderly-only centers must not see it.
 */
import { toDbEnumValue } from "../centerPage/centerEnumLocales";

export function centerSupportsNurseStaffing(careDomain: unknown): boolean {
  const db = toDbEnumValue("care_domain", careDomain);
  return db === "nursing" || db === "both";
}

/**
 * Super Admin keeps the global staffs tool. Center Admin only when their
 * centre's real `centers.care_domain` allows nurse staffing.
 * Unknown role (profile not loaded yet) keeps the item visible so the menu
 * does not flash empty before `/panel/user/profile` returns.
 */
export function shouldShowStaffsMenu(input: {
  role?: unknown;
  careDomain?: unknown;
}): boolean {
  const role = String(input.role ?? "").trim();
  if (!role) return true;
  if (role === "super_admin") return true;
  if (role === "center_admin") {
    return centerSupportsNurseStaffing(input.careDomain);
  }
  return false;
}

const STAFFS_MENU_VALUE = "staffs";

export function filterPanelMenuForNurseStaffing<T>(
  menu: T,
  input: { role?: unknown; careDomain?: unknown }
): T {
  if (!Array.isArray(menu)) return menu;
  if (shouldShowStaffsMenu(input)) return menu;
  return menu.filter(item => {
    if (!item || typeof item !== "object") return true;
    return String((item as { value?: unknown }).value ?? "") !== STAFFS_MENU_VALUE;
  }) as T;
}
