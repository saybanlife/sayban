/**
 * Unit tests for nurse-staffing menu visibility.
 *
 *   npx tsx scripts/test-nurse-staffing-access.mjs
 */
import assert from "node:assert/strict";
import {
  centerSupportsNurseStaffing,
  filterPanelMenuForNurseStaffing,
  shouldShowStaffsMenu
} from "../components/panel/nurseStaffingAccess.ts";

assert.equal(centerSupportsNurseStaffing("nursing"), true);
assert.equal(centerSupportsNurseStaffing("both"), true);
assert.equal(centerSupportsNurseStaffing("پرستاری"), true);
assert.equal(centerSupportsNurseStaffing("هر دو"), true);
assert.equal(centerSupportsNurseStaffing("elderly"), false);
assert.equal(centerSupportsNurseStaffing("سالمندان"), false);
assert.equal(centerSupportsNurseStaffing(null), false);
assert.equal(centerSupportsNurseStaffing(""), false);

assert.equal(
  shouldShowStaffsMenu({ role: "super_admin", careDomain: "elderly" }),
  true
);
assert.equal(
  shouldShowStaffsMenu({ role: "center_admin", careDomain: "nursing" }),
  true
);
assert.equal(
  shouldShowStaffsMenu({ role: "center_admin", careDomain: "both" }),
  true
);
assert.equal(
  shouldShowStaffsMenu({ role: "center_admin", careDomain: "elderly" }),
  false
);

const menu = [
  { value: "dashboard", label: "داشبورد" },
  { value: "staffs", label: "مدیریت پرستاران" },
  { value: "reservations", label: "رزروها" }
];

assert.deepEqual(
  filterPanelMenuForNurseStaffing(menu, {
    role: "center_admin",
    careDomain: "elderly"
  }).map(i => i.value),
  ["dashboard", "reservations"]
);
assert.deepEqual(
  filterPanelMenuForNurseStaffing(menu, {
    role: "center_admin",
    careDomain: "nursing"
  }).map(i => i.value),
  ["dashboard", "staffs", "reservations"]
);

console.log("test-nurse-staffing-access ok");
