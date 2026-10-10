/**
 * Smoke: reminder add-event wizard UI redesign (3 steps + chrome).
 *   node scripts/smoke-reminder-event-wizard-ui.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const steps2 = read("components/Steps2.tsx");
const stepsCss = read("components/Steps2Redesign.module.css");
const eventCss = read("components/ReminderEventPage.module.css");
const eventTsx = read("components/ReminderEventPage.tsx");
const setting = read("components/ReminderSetting.tsx");
const extrasCss = read("components/ReminderFormExtras.module.css");

assert.match(steps2, /toPersianDigits/);
assert.match(steps2, /data-steps2-redesign/);
assert.match(steps2, /stepLabels/);
assert.match(stepsCss, /\.track/);
assert.match(stepsCss, /\.item\[data-current="1"\]/);
assert.match(stepsCss, /30px/);
assert.match(stepsCss, /lineFill/);
assert.match(stepsCss, /#a3b18a/i);
assert.match(steps2, /--steps2-progress/);

assert.match(eventCss, /--ev-green:\s*#6f8a3a/i);
assert.match(eventCss, /--ev-cream:\s*#f5f1e3/i);
assert.match(eventCss, /--ev-chip:\s*#e7e2cf/i);
assert.match(eventCss, /--ev-radius-header:\s*32px/);
assert.match(eventCss, /--ev-btn-h:\s*52px/);
assert.match(eventCss, /data-reminder-event-step="0"/);
assert.match(eventCss, /data-reminder-event-step="1"/);
assert.match(eventCss, /data-reminder-event-step="2"/);
assert.match(eventCss, /button14/);
assert.match(eventCss, /110px/);
assert.match(eventCss, /padding-block:\s*16px/);
assert.match(eventTsx, /step >= 2/);
assert.match(eventTsx, /saybanReminderEvent: true, step/);

assert.match(setting, /eventStepStore\.set\(2\)/);
assert.match(setting, /مشخصات یادآوری/);
assert.match(setting, /زمان‌بندی/);
assert.match(setting, /روش ارسال/);
assert.match(setting, /visualCurrentStep: eventStep/);

assert.match(extrasCss, /dashed/);
assert.match(extrasCss, /5\.75rem/);

console.log("PASS smoke-reminder-event-wizard-ui");
