import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const asModuleUrl = source =>
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText
  ).toString("base64")}`;

const modelUrl = asModuleUrl(read("components/nurseRequest/nurseRequestModel.ts"));
const durationUrl = asModuleUrl(
  read("components/nurseRequest/staffServiceDuration.ts").replace(
    '"./nurseRequestModel"',
    JSON.stringify(modelUrl)
  )
);

const model = await import(modelUrl);
const duration = await import(durationUrl);

const services = [
  { id: 1, name: "حمام", category: "general", duration_mode: "once" },
  { id: 2, name: "مراقبت مداوم", category: "general", duration_mode: "continuous" },
  { id: 3, name: "یادآوری دارو", category: "general" },
  { id: 4, name: "تزریق", category: "specialized", duration_mode: "once" }
];

assert.deepEqual(
  duration
    .filterServicesByDuration(services, "once")
    .map(s => s.id),
  [1, 3, 4]
);
assert.deepEqual(
  duration
    .filterServicesByDuration(services, "continuous")
    .map(s => s.id),
  [2, 3]
);

assert.deepEqual(
  model
    .filterStaffServicesForRequest(services, "caregiver", "once")
    .map(s => s.id),
  [1, 3]
);
assert.deepEqual(
  model
    .filterStaffServicesForRequest(services, "nurse", "once")
    .map(s => s.id),
  [4]
);
assert.equal(duration.normalizeStaffServiceDurationMode("0"), null);
assert.equal(duration.normalizeStaffServiceDurationMode("continuous"), "continuous");

assert.match(read("components/AddServiseStaff.tsx"), /duration_mode/);
assert.match(
  read("components/centerPanel/CenterStaffServicesDurationManager.tsx"),
  /یک‌بار/
);
assert.match(read("src/pages/api/panel/staff-services.ts"), /duration_mode/);
assert.match(read("scripts/sql/staff_service_duration_mode.sql"), /duration_mode/);

console.log("staff service duration tests passed");
