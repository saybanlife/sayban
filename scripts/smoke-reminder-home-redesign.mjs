/**
 * Smoke: Reminder home redesign (header hero + board + FAB wiring).
 *   node scripts/smoke-reminder-home-redesign.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const reminder = read("components/Reminder.tsx");
const reminderCss = read("components/Reminder.module.css");
const board = read("components/reminder/ReminderHomeBoard.tsx");
const model = read("components/reminder/reminderHomeModel.ts");
const header = read("components/MainLiadHeaderDate.tsx");
const headerCss = read("components/MainLiadHeaderDate.module.css");
const mainCss = read("components/plasmic/sayban/PlasmicMainLiad.module.css");

assert.match(reminder, /ReminderHomeBoard/);
assert.match(reminder, /data-reminder-redesign/);
assert.match(reminder, /triggerAddReminder/);
assert.match(reminderCss, /boardSlot/);
assert.match(reminderCss, /plasmicLayer/);
assert.match(reminderCss, /--rm-yellow/);

assert.match(board, /یادآوری‌های پیش رو/);
assert.match(board, /یادآوری‌های امروز/);
assert.match(board, /upcomingCard/);
assert.match(board, /todayCard/);

assert.match(model, /pickTodayReminders/);
assert.match(model, /pickUpcomingReminders/);
assert.match(model, /pickFirstTodayReminder/);
assert.match(model, /isOccasionReminder/);

assert.match(header, /یادآوری‌ها/);
assert.match(header, /pickFirstTodayReminder/);
assert.match(header, /pageTitle/);
assert.match(headerCss, /\.digit\b/);
assert.match(headerCss, /\.dateLeft\b/);
assert.match(mainCss, /168px/);

console.log("PASS smoke-reminder-home-redesign");
