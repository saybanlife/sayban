/**
 * Unit tests for nursing-center glance facts (اطلاعات کلیدی).
 *
 *   npx tsx scripts/test-nursing-glance-facts.mjs
 */
import assert from "node:assert/strict";
import {
  EMPTY_GLANCE_FACTS,
  factsFromCenterResult,
  glanceDisplayRows,
  glanceFactsPayload,
  validateGlanceFacts
} from "../components/centerPanel/centerFactsSchema.ts";
import {
  formatDispatchWorkforceDisplay,
  isNursingGlanceProfile,
  toDbSetValue
} from "../components/centerPage/centerEnumLocales.ts";
import { getCenterGlanceItems } from "../components/centerPage/centerProfileFields.ts";

assert.equal(isNursingGlanceProfile("پرستاری"), true);
assert.equal(isNursingGlanceProfile("nursing"), true);
assert.equal(isNursingGlanceProfile("هر دو"), true);
assert.equal(isNursingGlanceProfile("سالمندان"), false);
assert.equal(isNursingGlanceProfile("elderly"), false);

const nursingForm = {
  ...EMPTY_GLANCE_FACTS,
  min_monthly_fee: "1000000",
  max_monthly_fee: "2000000",
  has_night_nurse: true,
  dispatch_workforce_types: [
    "مراقب یا همراه",
    "آلزایمر و دمانس",
    "بیمار سکته"
  ],
  license_type: "حقوقی"
};

assert.equal(validateGlanceFacts(nursingForm, "پرستاری"), null);
assert.match(
  String(validateGlanceFacts({ ...nursingForm, license_type: "" }, "پرستاری")),
  /مجوز/
);
assert.match(
  String(
    validateGlanceFacts(
      { ...nursingForm, dispatch_workforce_types: [] },
      "پرستاری"
    )
  ),
  /اعزام/
);

const nursingPayload = glanceFactsPayload(nursingForm, "پرستاری");
assert.equal(nursingPayload.license_type, "legal");
assert.equal(
  nursingPayload.dispatch_workforce_types,
  "companion,exp_alzheimers,exp_stroke"
);
assert.equal(nursingPayload.doctor_type, null);
assert.equal(nursingPayload.room_types, null);
assert.equal(nursingPayload.distance_to_hospital_km, null);
assert.equal(nursingPayload.caregiver_type, null);

const elderlyForm = {
  ...EMPTY_GLANCE_FACTS,
  min_monthly_fee: "1000000",
  max_monthly_fee: "2000000",
  has_night_nurse: false,
  distance_to_hospital_km: "2.5",
  doctor_type: "عمومی",
  caregiver_type: "مراقب",
  room_types: ["مستقل", "۲ تخته"]
};
assert.equal(validateGlanceFacts(elderlyForm, "سالمندان"), null);
const elderlyPayload = glanceFactsPayload(elderlyForm, "سالمندان");
assert.equal(elderlyPayload.doctor_type, "general");
assert.ok(!("dispatch_workforce_types" in elderlyPayload));
assert.ok(!("license_type" in elderlyPayload));

const loaded = factsFromCenterResult({
  care_domain: "nursing",
  min_monthly_fee: 1000000,
  max_monthly_fee: 2000000,
  has_night_nurse: 1,
  dispatch_workforce_types: "companion,specialist_nurse,exp_cancer",
  license_type: "business_license",
  doctor_type: "general",
  room_types: "independent",
  distance_to_hospital_km: 3
});
assert.deepEqual(loaded.glance.dispatch_workforce_types, [
  "مراقب یا همراه",
  "پرستار متخصص یا دارای مدرک دانشگاهی",
  "بیمار سرطانی"
]);
assert.equal(loaded.glance.license_type, "پروانه کسب");

const nursingRows = glanceDisplayRows(loaded.glance, "پرستاری");
const nursingLabels = nursingRows.map(r => r.label);
assert.ok(nursingLabels.includes("نوع نیروی قابل اعزام"));
assert.ok(nursingLabels.includes("نوع مجوز مرکز"));
assert.ok(!nursingLabels.includes("نوع پزشک"));
assert.ok(!nursingLabels.includes("نوع اتاق‌ها"));
assert.ok(!nursingLabels.includes("نزدیکی به بیمارستان (کیلومتر)"));
assert.ok(!nursingLabels.includes("نوع مراقب یا پرستار"));

const dispatchDisplay = formatDispatchWorkforceDisplay(
  "companion,exp_alzheimers,exp_stroke"
);
assert.match(dispatchDisplay, /مراقب یا همراه/);
assert.match(dispatchDisplay, /پرستار دارای تجربه مراقبت از/);
assert.match(dispatchDisplay, /آلزایمر و دمانس/);
assert.match(dispatchDisplay, /بیمار سکته/);

const publicNursing = getCenterGlanceItems({
  care_domain: "nursing",
  min_monthly_fee: 1000000,
  max_monthly_fee: 2000000,
  has_night_nurse: true,
  dispatch_workforce_types: "companion,exp_respiratory",
  license_type: "natural",
  doctor_type: "general",
  room_types: "independent",
  distance_to_hospital_km: 1
});
const publicKeys = publicNursing.map(i => i.key);
assert.ok(publicKeys.includes("dispatch_workforce_types"));
assert.ok(publicKeys.includes("license_type"));
assert.ok(!publicKeys.includes("doctor_type"));
assert.ok(!publicKeys.includes("room_types"));
assert.ok(!publicKeys.includes("hospital_distance"));
assert.ok(!publicKeys.includes("caregiver_type"));

const licenseItem = publicNursing.find(i => i.key === "license_type");
assert.equal(licenseItem?.value, "حقیقی");
const dispatchItem = publicNursing.find(
  i => i.key === "dispatch_workforce_types"
);
assert.match(String(dispatchItem?.value), /مراقب یا همراه/);
assert.match(String(dispatchItem?.value), /بیمار تنفسی/);

const publicElderly = getCenterGlanceItems({
  care_domain: "elderly",
  min_monthly_fee: 1000000,
  max_monthly_fee: 2000000,
  has_night_nurse: false,
  doctor_type: "specialist",
  caregiver_type: "nurse",
  room_types: "double",
  distance_to_hospital_km: 2,
  dispatch_workforce_types: "companion",
  license_type: "legal"
});
const elderlyKeys = publicElderly.map(i => i.key);
assert.ok(elderlyKeys.includes("doctor_type"));
assert.ok(elderlyKeys.includes("room_types"));
assert.ok(!elderlyKeys.includes("dispatch_workforce_types"));
assert.ok(!elderlyKeys.includes("license_type"));

assert.equal(
  toDbSetValue("dispatch_workforce_types", [
    "مراقب یا همراه",
    "بیمار تنفسی"
  ]),
  "companion,exp_respiratory"
);

console.log("ok nursing glance facts");
