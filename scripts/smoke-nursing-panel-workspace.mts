/**
 * Pure nursing centers hide elderly residential cards and working hours.
 *   node --import tsx scripts/smoke-nursing-panel-workspace.mts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  isPureNursingCenter,
  toDbEnumValue
} from "../components/centerPage/centerEnumLocales";
import {
  getAmenityItems,
  getWorkingHoursRows
} from "../components/centerPage/centerHelpers";

assert.equal(toDbEnumValue("care_domain", "nursing"), "nursing");
assert.equal(toDbEnumValue("care_domain", "پرستاری"), "nursing");
assert.equal(toDbEnumValue("care_domain", "both"), "both");
assert.equal(toDbEnumValue("care_domain", "elderly"), "elderly");
assert.equal(isPureNursingCenter("nursing"), true);
assert.equal(isPureNursingCenter("پرستاری"), true);
assert.equal(isPureNursingCenter("both"), false);
assert.equal(isPureNursingCenter("elderly"), false);

const workspace = fs.readFileSync(
  "components/centerPanel/CenterPanelWorkspace.tsx",
  "utf8"
);
assert.match(workspace, /isPureNursingCenter\(careDomain\)/);
assert.match(workspace, /hideElderlyProfileCards/);
assert.match(workspace, /hideElderlyProfileCards \? null/);
assert.match(workspace, /مراقبت و درمان/);
assert.match(workspace, /برنامه روزانه و فعالیت/);
assert.match(workspace, /ملاقات خانواده/);
assert.match(workspace, /امکانات/);
assert.match(
  workspace,
  /hideElderlyProfileCards \? null[\s\S]*امکانات[\s\S]*سوالات متداول/
);

const centerPage = fs.readFileSync("components/CenterPage.tsx", "utf8");
assert.match(centerPage, /isPureNursingCenter/);
assert.match(centerPage, /hideWorkingHours/);
assert.match(centerPage, /freeBox__oArX/);
assert.match(centerPage, /data-sayban-hide-working-hours/);

const hoursSection = fs.readFileSync(
  "components/centerPage/CenterWorkingHoursSection.tsx",
  "utf8"
);
assert.match(hoursSection, /isPureNursingCenter/);

const amenitiesSection = fs.readFileSync(
  "components/centerPage/CenterAmenitiesSection.tsx",
  "utf8"
);
assert.match(amenitiesSection, /isPureNursingCenter/);

assert.deepEqual(
  getWorkingHoursRows({
    care_domain: "nursing",
    working_hours: "شنبه: 08:00-16:00"
  }),
  []
);
assert.ok(
  getWorkingHoursRows({
    care_domain: "elderly",
    working_hours: "شنبه: 08:00-16:00"
  }).length > 0
);
assert.ok(
  getWorkingHoursRows({
    care_domain: "both",
    working_hours: "شنبه: 08:00-16:00"
  }).length > 0
);

assert.deepEqual(
  getAmenityItems({
    care_domain: "nursing",
    amenities: [{ name: "پارکینگ" }]
  }),
  []
);
assert.equal(
  getAmenityItems({
    care_domain: "elderly",
    amenities: [{ name: "پارکینگ" }]
  }).length,
  1
);

console.log("smoke-nursing-panel-workspace: ok");
