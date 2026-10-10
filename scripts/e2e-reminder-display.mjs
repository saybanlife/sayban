/**
 * Create a medicine reminder via real API and assert UI-contract filters pass
 * (homepage today list + ReminderSetting grouping + category catalog).
 *
 *   node scripts/e2e-reminder-display.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";

const {
  normalizeReminderList,
  hasMedicineReminderCategory,
  normalizeReminderCategoryCatalog,
  ALL_WEEKDAYS
} = await import(
  pathToFileURL(path.join(process.cwd(), "src/lib/reminderTask.ts")).href
);

function pma(sql) {
  const r = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
  return JSON.parse((r.stdout || "").trim());
}

function extractOtp(text, mobile) {
  return String(text).match(new RegExp(`${mobile}\\s+(\\d{4})\\s+`))?.[1] || null;
}

async function api(method, pathName, token, body) {
  const res = await fetch(new URL(pathName, API), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}

async function otpLogin(mobile) {
  await api("POST", "users/auth", null, { mobile });
  await new Promise((r) => setTimeout(r, 1500));
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${mobile}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", mobile);
  assert.ok(otp, "otp");
  const val = await api("POST", "users/validate", null, { mobile, code: otp });
  const token = val.json?.data?.token || val.json?.token;
  assert.ok(token, "jwt");
  return token;
}

/** Mirror PlasmicReminder homepage today filter (after normalize). */
function passesHomepageToday(reminder, todayWeekday) {
  if (reminder.active === 0) return false;
  let parsedDates = [];
  try {
    parsedDates = reminder.dates ? JSON.parse(reminder.dates) : [];
  } catch {
    parsedDates = [];
  }
  if (reminder.schedule_type === "everyDay") {
    let weekdays = [];
    try {
      weekdays = reminder.weekdays ? JSON.parse(reminder.weekdays) : [];
    } catch {
      weekdays = [];
    }
    return weekdays.includes(todayWeekday);
  }
  const todayISO = new Date().toLocaleDateString("en-CA");
  return parsedDates[0] === todayISO;
}

/** Mirror ReminderSetting grouping key. */
function settingGroupKey(reminder) {
  let parsedDates = [];
  try {
    parsedDates = reminder.dates ? JSON.parse(reminder.dates) : [];
  } catch {
    parsedDates = [];
  }
  if (reminder.schedule_type === "everyDay") return "__everyDay__";
  return parsedDates[0] || "__noDate__";
}

console.log("== login ==");
const token = await otpLogin(MOBILE);

console.log("== categories ==");
const cats = await api("GET", "reminders/categories");
assert.equal(cats.status, 200);
const catalog = normalizeReminderCategoryCatalog(cats.json);
assert.equal(hasMedicineReminderCategory(catalog), true, "medicine category");

console.log("== create medicine (UI-like: no weekdays) ==");
const name = `دارو-نمایش-${Date.now()}`;
const created = await api("POST", "user/task/add", token, {
  type: "medicine_time",
  schedule_type: "everyDay",
  name,
  text: "زمان مصرف دارو فرا رسیده است.",
  times: '["09:30"]',
  // Intentionally omit weekdays — reproduces Liad UI create bug
  channels: '["notification"]',
  active: 1
});
console.log("create", created.status, JSON.stringify(created.json).slice(0, 400));
assert.equal(created.status, 200);
assert.equal(created.json?.success, true, created.text.slice(0, 300));
const reminderId =
  Number(created.json?.result?.id) ||
  Number(created.json?.id) ||
  Number(created.json?.result?.[0]?.id);
assert.ok(reminderId > 0, "reminder id");

console.log("== list + normalize ==");
const listed = await api("GET", "user/task/list", token);
assert.equal(listed.status, 200);
assert.equal(listed.json?.success, true);
const normalized = normalizeReminderList(listed.json);
const found = normalized.find((r) => Number(r.id) === reminderId);
assert.ok(found, "created reminder in normalized list");
assert.equal(found.active, 1);
assert.equal(found.schedule_type, "everyDay");
assert.equal(found.type, "medicine_time");
const weekdays = JSON.parse(String(found.weekdays));
assert.ok(weekdays.length >= 7, `weekdays filled: ${found.weekdays}`);
assert.ok(weekdays.includes("monday"));

const todayWeekday = new Date()
  .toLocaleDateString("en-US", { weekday: "long" })
  .toLowerCase();
assert.equal(
  passesHomepageToday(found, todayWeekday),
  true,
  "homepage today filter"
);
assert.equal(settingGroupKey(found), "__everyDay__", "setting group");

console.log("PASS", {
  reminderId,
  name,
  todayWeekday,
  weekdays: found.weekdays,
  active: found.active
});
