/**
 * Smoke: expand annual display + pause/resume APIs.
 *   node --experimental-strip-types scripts/smoke-reminder-pause-display.mjs
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";

const { normalizeReminderListItem } = await import(
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

async function login() {
  await fetch(new URL("users/auth", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  await new Promise(r => setTimeout(r, 1500));
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", MOBILE);
  const val = await (
    await fetch(new URL("users/validate", API), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: MOBILE, code: otp })
    })
  ).json();
  return val?.data?.token || val?.token;
}

async function api(method, pathName, token, body) {
  const res = await fetch(new URL(pathName, API), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

const token = await login();
assert.ok(token, "login");

const list = await api("GET", "user/task/list", token);
const reminders = list.reminders || list.result || [];
const occasion = reminders.find(
  r =>
    String(r.schedule_type).includes("ear") ||
    String(r.schedule_type) === "everyYear" ||
    String(r.name || "").includes("تولد")
);
assert.ok(occasion, "find yearly occasion in list");

const normalized = normalizeReminderListItem(occasion);
const dates = JSON.parse(String(normalized.dates));
assert.ok(dates.length > 0, "has dates");
assert.ok(!String(dates[0]).startsWith("0000"), `expanded date got ${dates[0]}`);
assert.ok(!Number.isNaN(new Date(dates[0]).getTime()), "Date parseable");
console.log("display_ok", { id: occasion.id, name: occasion.name, dates });

const id = occasion.id;
const beforeActive = Number(occasion.active);
const pause = await api("POST", "reminders/pause", token, { id });
assert.equal(pause.success, true, `pause: ${JSON.stringify(pause)}`);
const afterPause = await api("GET", "user/task/list", token);
const pausedRow = (afterPause.reminders || afterPause.result || []).find(
  r => Number(r.id) === Number(id)
);
assert.equal(Number(pausedRow.active), 0);
assert.equal(pausedRow.status, "paused");
const pausedNorm = normalizeReminderListItem(pausedRow);
assert.equal(pausedNorm.active, 0);
console.log("pause_ok", { id, status: pausedRow.status, active: pausedNorm.active });

const resume = await api("POST", "reminders/resume", token, { id });
assert.equal(resume.success, true, `resume: ${JSON.stringify(resume)}`);
const afterResume = await api("GET", "user/task/list", token);
const resumedRow = (afterResume.reminders || afterResume.result || []).find(
  r => Number(r.id) === Number(id)
);
assert.equal(Number(resumedRow.active), 1);
assert.equal(resumedRow.status, "active");
console.log("resume_ok", {
  id,
  status: resumedRow.status,
  active: resumedRow.active,
  restoredFrom: beforeActive
});

console.log("PASS");
