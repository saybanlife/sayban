/**
 * API smoke: create reminder with patient_id + image_url, list, edit, delete.
 *   node scripts/e2e-reminder-companion-image.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";
const SAMPLE_IMAGE =
  "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png";

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

async function api(method, path, token, body) {
  const res = await fetch(new URL(path, API), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  return { status: res.status, ok: res.ok, json, text };
}

async function otpLogin(mobile) {
  await api("POST", "users/auth", null, { mobile });
  await new Promise(r => setTimeout(r, 1500));
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${mobile}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", mobile);
  assert.ok(otp, "otp missing");
  const verify = await api("POST", "users/validate", null, {
    mobile,
    code: otp
  });
  const token =
    verify.json?.data?.token ||
    verify.json?.token ||
    verify.json?.result?.token;
  assert.ok(token, "token missing " + JSON.stringify(verify.json).slice(0, 200));
  const userId = Number(verify.json?.data?.id || verify.json?.id) || null;
  return { token, userId };
}

function firstRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["reminders", "result", "items", "patients", "data"]) {
    if (Array.isArray(payload[key])) {
      return payload[key].filter(
        row => row && typeof row === "object" && row.id != null
      );
    }
  }
  return [];
}

const { token, userId } = await otpLogin(MOBILE);
const patients = await api("GET", "patients", token);
let companions = firstRows(patients.json);
if (!companions.length && userId) {
  // Ensure a companion exists for UI/API exercise.
  pma(
    `INSERT INTO users__patient (user_id, name, relation) SELECT ${Number(
      userId
    )}, 'همراه تست یادآوری', 'child' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users__patient WHERE user_id=${Number(
      userId
    )} AND name='همراه تست یادآوری' LIMIT 1)`
  );
  const refreshed = await api("GET", "patients", token);
  companions = firstRows(refreshed.json);
}
if (!companions.length && userId) {
  const db = pma(
    `SELECT id, user_id, name, relation FROM users__patient WHERE user_id=${Number(
      userId
    )} ORDER BY id DESC LIMIT 1`
  );
  const m = String(db.text || "").match(
    /DELETE FROM users__patient WHERE `users__patient`\.`id` = (\d+)\s+(\d+)\s+(\d+)\s+([^\s]+)/
  );
  // Fallback parse from pma dump: id then user_id then name
  const idMatch = String(db.text || "").match(
    /Inserted row id: (\d+)|`id` = (\d+)/
  );
  const plain = String(db.text || "").match(
    /\b(\d{1,6})\s+(\d{1,6})\s+([^\s]+(?:\s+[^\s]+)?)\s+(child|sister|brother|father|mother|other|relative|grandparent)/i
  );
  if (plain) {
    companions = [
      {
        id: Number(plain[1]),
        user_id: Number(plain[2]),
        name: plain[3],
        relation: plain[4]
      }
    ];
  } else if (idMatch) {
    companions = [{ id: Number(idMatch[1] || idMatch[2]), name: "companion" }];
  }
  void m;
}
assert.ok(companions.length > 0, "need at least one companion for user " + userId);
const companion = companions[0];
const patientId = Number(companion.id);
assert.ok(patientId > 0, "patient id");

const name = `companion-img-${Date.now()}`;
const create = await api("POST", "user/task/add", token, {
  type: "medicine_time",
  schedule_type: "everyDay",
  name,
  text: name,
  weekdays: JSON.stringify([
    "saturday",
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday"
  ]),
  times: JSON.stringify(["10:15"]),
  channels: JSON.stringify(["notification"]),
  patient_id: patientId,
  image_url: SAMPLE_IMAGE
});
assert.equal(create.json?.success, true, "create " + JSON.stringify(create.json).slice(0, 300));

const list1 = await api("GET", "reminders", token);
const rows1 = firstRows(list1.json);
const created = rows1.find(r => String(r.name) === name);
assert.ok(created, "created row in list");
assert.equal(Number(created.patient_id || created.patientId), patientId, "list patient");
assert.ok(
  String(created.image_url || created.imageUrl || "").includes("http"),
  "list image"
);
assert.ok(created.patient_name || created.patientName, "patient_name joined");

const editName = `${name}-edit`;
const edit = await api("POST", "user/task/edit", token, {
  id: created.id,
  type: created.type || "medicine_time",
  schedule_type: created.schedule_type || "everyDay",
  name: editName,
  text: editName,
  weekdays: created.weekdays,
  times: created.times || JSON.stringify(["10:15"]),
  channels: created.channels || created.chanels || JSON.stringify(["notification"]),
  patient_id: patientId,
  image_url: SAMPLE_IMAGE
});
assert.equal(edit.json?.success !== false, true, "edit ok " + JSON.stringify(edit.json).slice(0, 300));

const list2 = await api("GET", "reminders", token);
const rows2 = firstRows(list2.json);
const edited = rows2.find(r => Number(r.id) === Number(created.id));
assert.ok(edited, "edited in list");
assert.equal(String(edited.name), editName);
assert.equal(Number(edited.patient_id || edited.patientId), patientId);

await api("POST", "reminders/delete", token, { id: created.id });
console.log("e2e-reminder-companion-image ok", {
  id: created.id,
  patientId,
  patient_name: created.patient_name || created.patientName
});
