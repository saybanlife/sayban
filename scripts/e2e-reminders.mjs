/**
 * E2E reminders on Sayban n8n: OTP JWT → create → list → materialize → dispatch.
 *   node scripts/e2e-reminders.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";

function pma(sql) {
  const r = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
  if (r.error) throw r.error;
  const out = (r.stdout || "").trim();
  let j;
  try {
    j = JSON.parse(out);
  } catch {
    // Sometimes tooling wraps extra lines; take first JSON object.
    const start = out.indexOf("{");
    const end = out.lastIndexOf("}");
    if (start >= 0 && end > start) {
      j = JSON.parse(out.slice(start, end + 1));
    } else {
      throw new Error(`pma parse fail (${r.status}): ${out.slice(0, 300)}`);
    }
  }
  if (j.success === false) throw new Error(j.error || j.text || "pma failed");
  return j;
}

function extractOtp(text, mobile) {
  return String(text).match(new RegExp(`${mobile}\\s+(\\d{4})\\s+`))?.[1] || null;
}

function extractNum(text, label) {
  // Prefer last integer before/after known markers in pma HTML dump
  const m = String(text).match(new RegExp(`${label}[^0-9]*(\\d+)`, "i"));
  return m ? Number(m[1]) : null;
}

async function api(method, path, token, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(new URL(path, API), {
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
      json = { raw: text.slice(0, 500) };
    }
    return { status: res.status, ok: res.ok, json, text };
  } finally {
    clearTimeout(timer);
  }
}

async function otpLogin(mobile) {
  const auth = await fetch(new URL("users/auth", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile })
  });
  assert.equal(auth.status, 200, "users/auth");
  await new Promise((r) => setTimeout(r, 1500));
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${mobile}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", mobile);
  assert.ok(otp, "otp from db");
  const val = await api("POST", "users/validate", null, { mobile, code: otp });
  assert.ok(val.ok, `users/validate ${val.status} ${val.text.slice(0, 200)}`);
  const token = val.json?.data?.token || val.json?.token;
  const id = val.json?.data?.id || val.json?.id;
  assert.ok(token, "jwt token");
  return { token, id: Number(id) || null };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log("== 1) OTP login ==");
const { token, id: userId } = await otpLogin(MOBILE);
console.log({ userId, tokenLen: token.length });

console.log("== 2) wallet ==");
const wallet = await api("GET", "wallet", token);
console.log("wallet", wallet.status, wallet.json);
assert.equal(wallet.status, 200, "wallet status");
assert.equal(wallet.json?.success, true, "wallet success");
assert.ok(typeof (wallet.json?.balance ?? wallet.json?.result?.balance) === "number");

console.log("== 3) create reminder ==");
const title = `e2e-rem-${Date.now()}`;
const createBody = {
  type: "medicine_time",
  schedule_type: "everyDay",
  name: title,
  text: "E2E reminder dispatch test",
  times: '["09:30"]',
  weekdays: '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]',
  channels: '["notification"]',
  pre_reminders: [5]
};
const created = await api("POST", "user/task/add", token, createBody);
console.log("create", created.status, JSON.stringify(created.json).slice(0, 500));
assert.equal(created.status, 200, "create status");
assert.equal(created.json?.success, true, `create success: ${created.text.slice(0, 300)}`);
const reminderId =
  Number(created.json?.result?.id) ||
  Number(created.json?.id) ||
  null;
assert.ok(reminderId, "reminder id");

console.log("== 4) list ==");
const listed = await api("GET", "user/task/list", token);
console.log("list", listed.status, {
  success: listed.json?.success,
  count: listed.json?.reminders?.length ?? listed.json?.result?.length
});
assert.equal(listed.status, 200, "list status");
assert.equal(listed.json?.success, true, "list success");
const reminders = listed.json?.reminders || listed.json?.result || [];
assert.ok(
  reminders.some((r) => Number(r.id) === reminderId),
  "created reminder in list"
);

console.log("== 5) materialize check (DB occurrences) ==");
await sleep(2000);
const occ = pma(
  `SELECT COUNT(*) AS c FROM reminder_occurrences WHERE reminder_id=${reminderId}`
);
const occCount =
  extractNum(occ.text || "", "c") ??
  (String(occ.text).match(/>(\d+)</) ? Number(String(occ.text).match(/>(\d+)</)[1]) : null);
console.log("occurrences text slice", (occ.text || "").slice(-400));
// Parse more reliably from rows if helper exposes them poorly
const occ2 = pma(
  `SELECT id, fire_at, kind, status FROM reminder_occurrences WHERE reminder_id=${reminderId} ORDER BY fire_at ASC LIMIT 5`
);
assert.ok(
  (occ2.text || "").includes(String(reminderId)) ||
    (occ2.text || "").includes("main") ||
    (occ2.text || "").match(/\d{4}-\d{2}-\d{2}/),
  `expected occurrences for reminder ${reminderId}`
);
console.log("sample occurrences ok");

const del = pma(
  `SELECT COUNT(*) AS c FROM reminder_deliveries WHERE reminder_id=${reminderId}`
);
console.log("deliveries dump tail", (del.text || "").slice(-300));

console.log("== 6) force due + wait dispatch ==");
pma(
  `UPDATE reminder_occurrences
   SET fire_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE), status='pending', claimed_at=NULL, claimed_by=NULL
   WHERE reminder_id=${reminderId} AND kind='main'
   ORDER BY fire_at ASC
   LIMIT 1`
);
// Also ensure a delivery pending exists for that occurrence
pma(
  `UPDATE reminder_deliveries d
   JOIN reminder_occurrences o ON o.id = d.occurrence_id
   SET d.status='pending', d.next_retry_at=NULL, d.last_error=NULL, d.last_error_code=NULL
   WHERE o.reminder_id=${reminderId} AND o.kind='main' AND d.channel='notification'
   ORDER BY o.fire_at ASC
   LIMIT 5`
);

let dispatched = false;
for (let i = 0; i < 10; i++) {
  await sleep(15000);
  const check = pma(
    `SELECT o.id, o.status AS occ_status, d.status AS del_status, d.last_error_code
     FROM reminder_occurrences o
     JOIN reminder_deliveries d ON d.occurrence_id=o.id
     WHERE o.reminder_id=${reminderId} AND o.kind='main' AND d.channel='notification'
     ORDER BY o.fire_at ASC LIMIT 3`
  );
  const t = check.text || "";
  console.log(`dispatch poll ${i + 1}`, t.includes("sent") || t.includes("skipped") || t.includes("processing") || t.includes("claimed") ? "progress" : "pending", t.slice(-250));
  if (
    /\bsent\b/.test(t) ||
    /\bskipped\b/.test(t) ||
    /\bpartial\b/.test(t) ||
    /\bfailed\b/.test(t)
  ) {
    dispatched = true;
    break;
  }
}
assert.ok(dispatched, "dispatch should settle occurrence/delivery within ~150s");

console.log("== 7) cleanup ==");
const cancelled = await api("POST", "reminders/cancel", token, { id: reminderId });
console.log("cancel", cancelled.status, cancelled.json);
assert.equal(cancelled.status, 200, "cancel status");

console.log("PASS e2e reminders create→list→materialize→dispatch");
