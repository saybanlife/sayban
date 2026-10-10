/**
 * ReminderEventPage must stay a 500px phone column (not Dialog max-width:100%).
 * Portaled so it opens on main Reminder (nested ReminderSetting) too.
 *   node scripts/smoke-reminder-event-page-design.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const pageTsx = fs.readFileSync("components/ReminderEventPage.tsx", "utf8");
const pageCss = fs.readFileSync("components/ReminderEventPage.module.css", "utf8");
const setting = fs.readFileSync("components/ReminderSetting.tsx", "utf8");
const reminder = fs.readFileSync("components/Reminder.tsx", "utf8");

assert.match(pageTsx, /lockBodyScroll/);
assert.match(pageTsx, /createPortal/);
assert.match(pageTsx, /data-reminder-event-page/);
// Must not spread Dialog props/className onto the shell.
assert.doesNotMatch(pageTsx, /\{\.\.\.props\}/);
assert.doesNotMatch(pageTsx, /className=\{className\}/);

assert.match(pageCss, /--sayban-app-max/);
assert.match(pageCss, /--ev-cream|--token-KPGXdu9o7llP|token-ee2TuxDknsJj/);
assert.match(pageCss, /freeBox__iq19N/);
assert.match(pageCss, /freeBox__yWwKt/);
assert.match(pageCss, /z-index:\s*200/);
assert.match(pageCss, /data-reminder-event-step="2"/);

assert.match(setting, /ReminderEventPageBridge/);
assert.match(setting, /data-reminder-event-open/);
assert.match(setting, /Do not forward Dialog `className`/);
assert.match(setting, /renderProps\.children/);
assert.doesNotMatch(setting, /<ReminderEventPage \{\.\.\.renderProps\}/);

assert.match(reminder, /ReminderEventPage/);
assert.match(reminder, /renderEventPage/);

console.log("smoke-reminder-event-page-design: ok");
