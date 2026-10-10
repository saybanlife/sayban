/**
 * Unit: reminder home model (today / upcoming picks).
 *   npx tsx scripts/test-reminder-home-model.mjs
 */
import assert from "node:assert/strict";
import {
  pickFirstTodayReminder,
  pickTodayReminders,
  pickUpcomingReminders
} from "../components/reminder/reminderHomeModel.ts";

const weekdays =
  '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]';

const data = [
  {
    id: 1,
    name: "زمان دارو",
    type: "medicine_time",
    schedule_type: "everyDay",
    active: 1,
    times: '["13:47"]',
    weekdays,
    dates: "[]"
  },
  {
    id: 2,
    name: "سالگرد",
    type: "occasion",
    schedule_type: "everyYear",
    active: 1,
    times: '["09:30"]',
    weekdays: "[]",
    dates: '["2099-01-15"]'
  }
];

const today = pickTodayReminders(data);
assert.ok(today.length >= 1);
assert.equal(today[0].title, "زمان دارو");
assert.equal(today[0].timeShort, "۱۳:۴۷");

const upcoming = pickUpcomingReminders(data);
assert.ok(upcoming.some(r => r.isOccasion));

const first = pickFirstTodayReminder(data);
assert.ok(first);
assert.equal(first.id, 1);

console.log("PASS test-reminder-home-model");
