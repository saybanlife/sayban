/**
 * Full Reminder stack E2E on Sayban:
 * catalog → report → wallet → CRUD (all types) → pause/resume → materialize → dispatch → cancel/delete
 *
 *   node --experimental-strip-types scripts/e2e-reminder-full.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";

const {
  normalizeReminderList,
  normalizeReminderCategoryCatalog,
  buildReminderCostReport,
  hasMedicineReminderCategory
} = await import(
  pathToFileURL(path.join(process.cwd(), "src/lib/reminderTask.ts")).href
);

function pma(sql) {
  const r = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
  if (r.error) throw r.error;
  const out = (r.stdout || "").trim();
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  const j = JSON.parse(out.slice(start, end + 1));
  if (j.success === false) throw new Error(j.error || j.text || "pma failed");
  return j;
}

function extractOtp(text, mobile) {
  return String(text).match(new RegExp(`${mobile}\\s+(\\d{4})\\s+`))?.[1] || null;
}

async function api(method, pathName, token, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(new URL(pathName, API), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 400) };
    }
    return { status: res.status, ok: res.ok, json, text };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function reminderIdFrom(json) {
  return (
    Number(json?.result?.id) ||
    Number(json?.id) ||
    Number(json?.result?.[0]?.id) ||
    0
  );
}

async function otpLogin(mobile) {
  const auth = await api("POST", "users/auth", null, { mobile });
  assert.equal(auth.status, 200, "users/auth");
  await sleep(1500);
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${mobile}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", mobile);
  assert.ok(otp, "otp");
  const val = await api("POST", "users/validate", null, { mobile, code: otp });
  assert.ok(val.ok, `validate ${val.status}`);
  const token = val.json?.data?.token || val.json?.token;
  assert.ok(token, "jwt");
  return token;
}

const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log("  OK", name);
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
    console.error("  FAIL", name, e.message);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    console.log("  OK", name);
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
    console.error("  FAIL", name, e.message);
  }
}

console.log("== A) public catalog + report ==");
await checkAsync("categories", async () => {
  const r = await api("GET", "reminders/categories");
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
  const cat = normalizeReminderCategoryCatalog(r.json);
  assert.ok(hasMedicineReminderCategory(cat));
  assert.ok(cat.category.length >= 3);
  assert.ok(cat.type.length >= 3);
  for (const t of cat.type) {
    assert.equal(t.items[0].__addDisabled, false);
  }
});
await checkAsync("occasions", async () => {
  const r = await api("GET", "reminders/occasions");
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
});
await checkAsync("suggestions", async () => {
  const r = await api("GET", "reminders/suggestions");
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
});
await checkAsync("report/insert", async () => {
  const r = await api("POST", "report/insert", null, {
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
      name: "cost-preview"
    }
  });
  assert.equal(r.status, 200, r.text.slice(0, 200));
  assert.ok(r.json?.totalNotifications > 0);
  assert.ok(Array.isArray(r.json?.totalPerChannel));
  assert.ok(r.json.totalPerChannel.some(c => c.type === "sms"));
  const local = buildReminderCostReport({
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
      name: "cost-preview"
    }
  });
  assert.equal(local.totalNotifications, r.json.totalNotifications);
});

console.log("== B) auth + wallet ==");
const token = await otpLogin(MOBILE);
await checkAsync("wallet", async () => {
  const r = await api("GET", "wallet", token);
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
});
await checkAsync("wallet/transactions", async () => {
  const r = await api("GET", "wallet/transactions", token);
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
});

console.log("== C) create all category types ==");
const stamp = Date.now();
const createdIds = [];

await checkAsync("create medicine_time", async () => {
  const r = await api("POST", "user/task/add", token, {
    type: "medicine_time",
    schedule_type: "everyDay",
    name: `full-med-${stamp}`,
    text: "مصرف دارو",
    times: '["09:30"]',
    weekdays:
      '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]',
    channels: '["notification"]',
    pre_reminders: [5]
  });
  assert.equal(r.status, 200, r.text.slice(0, 300));
  assert.equal(r.json?.success, true, r.text.slice(0, 300));
  const id = reminderIdFrom(r.json);
  assert.ok(id > 0);
  createdIds.push({ id, type: "medicine_time" });
});

await checkAsync("create appointment", async () => {
  const r = await api("POST", "user/task/add", token, {
    type: "appointment",
    schedule_type: "everyYear",
    name: `full-appt-${stamp}`,
    text: "نوبت پزشک",
    times: '["10:00"]',
    dates: '["0000-10-15"]',
    channels: '["notification"]'
  });
  assert.equal(r.status, 200, r.text.slice(0, 300));
  assert.equal(r.json?.success, true, r.text.slice(0, 300));
  const id = reminderIdFrom(r.json);
  assert.ok(id > 0, `id from ${JSON.stringify(r.json).slice(0, 200)}`);
  createdIds.push({ id, type: "appointment" });
});

await checkAsync("create occasion", async () => {
  const r = await api("POST", "user/task/add", token, {
    type: "occasion",
    schedule_type: "everyYear",
    name: `full-occ-${stamp}`,
    text: "روز مادر مبارک",
    times: '["09:00"]',
    dates: '["0000-05-12"]',
    channels: '["notification"]'
  });
  assert.equal(r.status, 200, r.text.slice(0, 300));
  assert.equal(r.json?.success, true, r.text.slice(0, 300));
  const id = reminderIdFrom(r.json);
  assert.ok(id > 0);
  createdIds.push({ id, type: "occasion" });
});

console.log("== D) list + UI normalize ==");
let medicineId = createdIds.find(x => x.type === "medicine_time")?.id;
await checkAsync("list reminders", async () => {
  const r = await api("GET", "user/task/list", token);
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
  const rows = normalizeReminderList(r.json);
  assert.ok(rows.length >= createdIds.length);
  for (const { id, type } of createdIds) {
    const row = rows.find(x => Number(x.id) === id);
    assert.ok(row, `list has ${type}#${id}`);
    assert.equal(row.active, 1);
    assert.ok(row.schedule_type === "everyDay" || row.schedule_type === "everyYear");
  }
  const med = rows.find(x => Number(x.id) === medicineId);
  assert.ok(JSON.parse(String(med.weekdays)).includes("monday"));
});

console.log("== E) edit / pause / resume ==");
await checkAsync("edit medicine", async () => {
  const r = await api("POST", "user/task/edit", token, {
    id: medicineId,
    type: "medicine_time",
    schedule_type: "everyDay",
    name: `full-med-edited-${stamp}`,
    text: "ویرایش دارو",
    times: '["08:00","20:00"]',
    weekdays:
      '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]',
    channels: '["notification"]'
  });
  assert.equal(r.status, 200, r.text.slice(0, 300));
  assert.equal(r.json?.success, true, r.text.slice(0, 300));
  const listed = await api("GET", "user/task/list", token);
  const row = normalizeReminderList(listed.json).find(
    x => Number(x.id) === medicineId
  );
  assert.equal(row.name, `full-med-edited-${stamp}`);
  assert.deepEqual(JSON.parse(String(row.times)), ["08:00", "20:00"]);
});

await checkAsync("pause", async () => {
  const r = await api("POST", "reminders/pause", token, { id: medicineId });
  assert.equal(r.status, 200, r.text.slice(0, 200));
  assert.equal(r.json?.success, true, r.text.slice(0, 200));
  const listed = await api("GET", "user/task/list", token);
  const row = normalizeReminderList(listed.json).find(
    x => Number(x.id) === medicineId
  );
  assert.equal(row.active, 0);
  assert.equal(String(row.status).toLowerCase(), "paused");
});

await checkAsync("resume", async () => {
  const r = await api("POST", "reminders/resume", token, { id: medicineId });
  assert.equal(r.status, 200, r.text.slice(0, 200));
  assert.equal(r.json?.success, true, r.text.slice(0, 200));
  const listed = await api("GET", "user/task/list", token);
  const row = normalizeReminderList(listed.json).find(
    x => Number(x.id) === medicineId
  );
  assert.equal(row.active, 1);
  assert.equal(String(row.status).toLowerCase(), "active");
});

console.log("== F) materialize + dispatch ==");
await checkAsync("materialize occurrences", async () => {
  await sleep(1500);
  const dump = pma(
    `SELECT id, fire_at, kind, status FROM reminder_occurrences WHERE reminder_id=${medicineId} ORDER BY fire_at ASC LIMIT 5`
  );
  assert.ok(
    (dump.text || "").match(/\d{4}-\d{2}-\d{2}/),
    `no occurrences for ${medicineId}`
  );
});

await checkAsync("force dispatch notification", async () => {
  pma(
    `UPDATE reminder_occurrences
     SET fire_at = DATE_SUB(NOW(), INTERVAL 2 MINUTE), status='pending', claimed_at=NULL, claimed_by=NULL
     WHERE reminder_id=${medicineId} AND kind='main'
     ORDER BY fire_at ASC LIMIT 1`
  );
  pma(
    `UPDATE reminder_deliveries d
     JOIN reminder_occurrences o ON o.id = d.occurrence_id
     SET d.status='pending', d.next_retry_at=NULL, d.last_error=NULL, d.last_error_code=NULL
     WHERE o.reminder_id=${medicineId} AND o.kind='main' AND d.channel='notification'`
  );
  let settled = false;
  for (let i = 0; i < 12; i++) {
    await sleep(12000);
    const check = pma(
      `SELECT o.status AS occ_status, d.status AS del_status
       FROM reminder_occurrences o
       JOIN reminder_deliveries d ON d.occurrence_id=o.id
       WHERE o.reminder_id=${medicineId} AND o.kind='main' AND d.channel='notification'
       ORDER BY o.fire_at ASC LIMIT 3`
    );
    const t = check.text || "";
    if (/\bsent\b|\bskipped\b|\bpartial\b|\bfailed\b/.test(t)) {
      settled = true;
      console.log("    dispatch settled", t.slice(-180));
      break;
    }
    console.log(`    poll ${i + 1} pending`);
  }
  assert.ok(settled, "dispatch did not settle within ~144s");
});

console.log("== G) cancel + delete ==");
const apptId = createdIds.find(x => x.type === "appointment")?.id;
const occId = createdIds.find(x => x.type === "occasion")?.id;

await checkAsync("cancel appointment", async () => {
  const r = await api("POST", "reminders/cancel", token, { id: apptId });
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
});

await checkAsync("delete occasion", async () => {
  const r = await api("POST", "reminders/delete", token, { id: occId });
  assert.equal(r.status, 200, r.text.slice(0, 200));
  assert.equal(r.json?.success, true, r.text.slice(0, 200));
});

await checkAsync("cancel medicine", async () => {
  const r = await api("POST", "reminders/cancel", token, { id: medicineId });
  assert.equal(r.status, 200);
  assert.equal(r.json?.success, true);
});

await checkAsync("auth required on list", async () => {
  const r = await api("GET", "user/task/list");
  assert.ok(r.status === 401 || r.json?.success === false || r.status === 403);
});

console.log("\n==== SUMMARY ====");
if (failures.length) {
  console.error("FAILED", failures.length);
  for (const f of failures) console.error("-", f);
  process.exit(1);
}
console.log("PASS full reminder E2E");
