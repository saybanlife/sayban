/**
 * Simulate ReminderCategory dialog: all categories selectable.
 *   node --experimental-strip-types scripts/test-reminder-category-dialog.mjs
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const { normalizeReminderCategoryCatalog, buildReminderCostReport } =
  await import(
    pathToFileURL(path.join(process.cwd(), "src/lib/reminderTask.ts")).href
  );

const api = await (
  await fetch("https://sayban.darkube.ir/webhook/reminders/categories")
).json();

const ui = normalizeReminderCategoryCatalog(api);
assert.ok(ui.category.length >= 3, "all category chips");
assert.ok(ui.type.length >= 3, "all type sections");

const names = ui.category.map(c => c.name);
assert.ok(names.includes("medicine_time"));
assert.ok(names.includes("appointment"));
assert.ok(names.includes("occasion"));

for (const section of ui.type) {
  assert.ok(section.items?.length > 0, section.category_name);
  for (const item of section.items) {
    assert.ok(item.label, "label");
    assert.ok(item.value, "value");
    assert.equal(item.__addDisabled, false, "selectable");
  }
}

const report = buildReminderCostReport({
  data: {
    schedule_type: "everyDay",
    weekdays: JSON.stringify([
      "saturday",
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday"
    ]),
    times: '["09:30"]',
    name: "test"
  }
});
assert.ok(report.totalNotifications > 0);
assert.equal(report.totalPerChannel.length, 3);
assert.ok(report.totalPerChannel.some(c => c.type === "sms"));

console.log("PASS all categories selectable + cost report", {
  chips: ui.category.map(c => c.label),
  notifications: report.totalNotifications,
  channels: report.totalPerChannel.map(c => c.type)
});
