/**
 * Smoke checks for center nurses section helpers.
 *   node --import tsx scripts/smoke-center-staff-section.mts
 */
import assert from "node:assert/strict";
import {
  buildCenterStaffListRoute,
  buildStaffRoute,
  extractCenterStaffsIdFromSlug
} from "../components/centerNavigation";
import { normalizeCenterStaff } from "../components/centerPage/centerStaffModel";
import { isNursingGlanceProfile } from "../components/centerPage/centerEnumLocales";
import { resolveHomepageActiveViews } from "../components/homepage/activeView";

assert.equal(isNursingGlanceProfile("nursing"), true);
assert.equal(isNursingGlanceProfile("elderly"), false);

const staff = normalizeCenterStaff([
  {
    id: 40,
    name: "علی رضایی",
    avatar: "",
    rating: 4.5,
    experience_years: 12,
    gender: "male",
    type: "general"
  },
  { id: 0, name: "bad" },
  { id: 26, name: "مریم احمدی", experience_years: 10, rating: 0 }
]);
assert.equal(staff.length, 2);
assert.equal(staff[0].id, 40);

assert.equal(buildStaffRoute("home", 40), "/home/staff_40");
assert.equal(
  buildCenterStaffListRoute("home", 108),
  "/home/centerStaffs_108"
);
assert.equal(
  extractCenterStaffsIdFromSlug(["foo", "centerStaffs_151"]),
  "151"
);

const views = resolveHomepageActiveViews("home", ["centerStaffs_108"]);
assert.equal(views.has("centerStaffs"), true);
assert.equal(views.has("center"), false);

console.log("smoke-center-staff-section: ok");
