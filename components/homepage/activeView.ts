export type HomepageActiveView =
  | "home"
  | "user"
  | "mainLiad"
  | "categories"
  | "subcategories"
  | "center"
  | "booking"
  | "payment"
  | "about"
  | "faQs"
  | "rules"
  | "editUser"
  | "notif"
  | "addPatient"
  | "patient"
  | "reminderSetting"
  | "address"
  | "favorites"
  | "centerStaffs"
  | "addAddress"
  | "payResult"
  | "centerOffers"
  | "staffs"
  | "staff";

/** Mirrors PlasmicHomepage's URL-to-variant rules without mounting every view. */
export function resolveHomepageActiveViews(
  pageBase: string,
  slugParts: readonly string[],
  paymentStatus?: string | string[]
): ReadonlySet<HomepageActiveView> {
  const active = new Set<HomepageActiveView>();
  const includes = (value: string) => slugParts.includes(value);
  const hasPrefix = (prefix: string) =>
    slugParts.some(part => part.startsWith(prefix));

  if (includes("addAddress")) active.add("addAddress");
  else if (includes("addPatient")) active.add("addPatient");
  else if (includes("bookNurse")) active.add("centerOffers");
  else if (hasPrefix("pay_")) active.add("payment");
  else if (hasPrefix("centerStaffs_")) active.add("centerStaffs");
  else if (includes("center")) active.add("center");
  else if (hasPrefix("staff_")) active.add("staff");
  else if (hasPrefix("offer_")) active.add("staffs");
  else if (includes("editProfile")) active.add("editUser");
  else if (includes("booking")) active.add("booking");
  else if (includes("FAQ")) active.add("faQs");
  else if (includes("about")) active.add("about");
  else if (includes("rules")) active.add("rules");
  else if (includes("notif")) active.add("notif");
  else if (includes("patient")) active.add("patient");
  else if (includes("address")) active.add("address");
  else if (includes("favorites")) active.add("favorites");
  else if (includes("reminderSetting")) active.add("reminderSetting");
  else if (slugParts.length > 0) active.add("subcategories");
  else if (pageBase === "user") active.add("user");
  else if (pageBase === "reminder") active.add("mainLiad");
  else if (pageBase === "booking") active.add("booking");
  else if (pageBase === "categories") active.add("categories");
  else active.add("home");

  const status = Array.isArray(paymentStatus) ? paymentStatus[0] : paymentStatus;
  if (status === "true" || status === "false") active.add("payResult");
  return active;
}
