/**
 * Unit tests for reminder schedule helpers (Tehran, 30-day horizon).
 *   node --test scripts/test-reminder-schedule.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { TEHRAN_SCHEDULE_JS } from "./n8n/reminders/helpers.mjs";

function loadHelpers() {
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${TEHRAN_SCHEDULE_JS}; return { buildFireSlots, normalizeChannels, normalizeScheduleType, tehranNowString };`);
  return fn();
}

test("normalize channels defaults and filters", () => {
  const { normalizeChannels } = loadHelpers();
  assert.deepEqual(normalizeChannels('["notification","sms","bale"]'), [
    "notification",
    "sms",
    "bale"
  ]);
  assert.deepEqual(normalizeChannels('["telegram","notification"]'), [
    "notification"
  ]);
  assert.deepEqual(normalizeChannels("[]"), ["notification"]);
});

test("every_day medicine builds main slots within horizon", () => {
  const { buildFireSlots } = loadHelpers();
  const slots = buildFireSlots(
    {
      name: "دارو",
      text: "مصرف دارو",
      schedule_type: "everyDay",
      times: '["20:00"]',
      weekdays: '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]',
      channels: '["notification"]',
      pre_reminders: [15]
    },
    30
  );
  assert.ok(slots.length >= 30);
  assert.ok(slots.some((s) => s.kind === "main"));
  assert.ok(slots.some((s) => s.kind === "pre" && s.pre_offset_minutes === 15));
  assert.ok(slots.every((s) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s.fire_at)));
});

test("schedule_type aliases", () => {
  const { normalizeScheduleType } = loadHelpers();
  assert.equal(normalizeScheduleType("everyDay"), "every_day");
  assert.equal(normalizeScheduleType("everyYear"), "every_year");
});
