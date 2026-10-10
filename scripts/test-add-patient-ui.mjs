import assert from "node:assert/strict";
import fs from "node:fs";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const component = read("components/AddPatient.tsx");
const styles = read("components/AddPatient.module.css");

assert.match(component, /افزودن سالمند/);
assert.match(component, /فقط ۳ چیز می‌پرسیم/);
assert.match(component, /نام سالمند/);
assert.match(component, /تاریخ تولد/);
assert.match(component, /نسبت با شما/);
assert.match(component, /ذخیره و ادامه/);
assert.match(component, /PanelDatePicker/);
assert.match(component, /ageFromBirthDate/);
assert.match(component, /Fragment\.apiRequest/);
assert.match(component, /\/add\/patients/);
assert.match(component, /update\/patient/);
assert.match(component, /birth_date/);

for (const relation of [
  "mother",
  "father",
  "spouse",
  "grandmother",
  "grandfather",
  "other"
]) {
  assert.match(component, new RegExp(`value: "${relation}"`));
}

assert.match(styles, /\.page[\s\S]*background:/);
assert.match(styles, /\.relationChips[\s\S]*flex-wrap:\s*wrap/);
assert.match(styles, /\.relationChipSelected[\s\S]*border-color:/);
assert.match(styles, /\.ageBadge/);
assert.match(styles, /\.primary[\s\S]*#f9bd00|#f9bd00|var\(--ap-yellow\)/);
assert.match(styles, /\.notice/);

console.log("AddPatient UI tests passed.");
