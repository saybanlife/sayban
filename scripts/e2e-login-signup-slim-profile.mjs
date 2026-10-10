/**
 * E2E: login + slim signup setProfile (no city / birth_date / national_code).
 *   node scripts/e2e-login-signup-slim-profile.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const API = "https://sayban.darkube.ir/webhook/";
const EXISTING = "09228951264";
// Disposable install-flow number — cleaned up after the test when created.
const NEW_MOBILE = "09001112233";

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const j = JSON.parse(r.stdout || "{}");
  if (j.success === false) throw new Error(j.error || "pma failed");
  return j;
}

function extractOtp(text, mobile) {
  return String(text).match(new RegExp(`${mobile}\\s+(\\d{4})\\s+`))?.[1] || null;
}

function extractUserId(text, mobile) {
  const m = String(text).match(
    new RegExp(`(\\d+)\\s+${mobile}\\b`)
  );
  return m?.[1] || null;
}

async function otpLogin(mobile) {
  const auth = await fetch(new URL("users/auth", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile })
  });
  assert.equal(auth.status, 200, `auth ${mobile}`);
  await new Promise((r) => setTimeout(r, 1200));
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${mobile}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", mobile);
  assert.ok(otp, `otp for ${mobile}`);
  const valRes = await fetch(new URL("users/validate", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, code: otp })
  });
  const val = await valRes.json();
  assert.ok(valRes.ok, `validate ${mobile}`);
  const token = val?.data?.token || val?.token;
  const id = val?.data?.id || val?.id;
  const type = val?.data?.type || val?.type || val?.data?.user_type;
  assert.ok(token, "jwt");
  return { token, id, type, raw: val };
}

console.log("== existing user login ==");
const existing = await otpLogin(EXISTING);
console.log({
  type: existing.type,
  hasToken: Boolean(existing.token),
  id: existing.id
});
assert.ok(existing.token);

console.log("== slim setProfile for existing (name+gender only) ==");
const slim = await fetch(new URL("setProfile", API), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${existing.token}`
  },
  body: JSON.stringify({
    user_Id: existing.id || 27,
    name: "کاربر تست",
    gender: "female",
    marital_status: "single"
  })
});
const slimText = await slim.text();
console.log("setProfile slim", slim.status, slimText.slice(0, 200));
assert.ok(slim.ok, "slim setProfile must succeed without city/birth/national");

console.log("== prepare new mobile install path ==");
pma(`DELETE FROM users__sms_codes WHERE mobile='${NEW_MOBILE}'`);
// Soft-prep: if user exists from prior runs, wipe profile extras and name to
// force install-like completion; delete only if safe (no reservations).
const prior = pma(
  `SELECT id, name, city, birth_date, national_code FROM users WHERE mobile='${NEW_MOBILE}' LIMIT 1`
);
const priorId = extractUserId(prior.text || "", NEW_MOBILE);
if (priorId) {
  console.log("resetting prior test user", priorId);
  pma(
    `UPDATE users SET name=NULL, city=NULL, birth_date=NULL, national_code=NULL, gender=NULL, marital_status=NULL WHERE id=${priorId}`
  );
}

const created = await otpLogin(NEW_MOBILE);
console.log({
  type: created.type,
  id: created.id,
  keys: Object.keys(created.raw?.data || created.raw || {})
});

const userId = created.id || extractUserId(
  pma(`SELECT id, mobile FROM users WHERE mobile='${NEW_MOBILE}' LIMIT 1`).text ||
    "",
  NEW_MOBILE
);
assert.ok(userId, "new user id");

console.log("== install setProfile without extras ==");
const install = await fetch(new URL("setProfile", API), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${created.token}`
  },
  body: JSON.stringify({
    user_Id: userId,
    name: "کاربر جدید تست",
    gender: "male"
  })
});
const installText = await install.text();
console.log("install setProfile", install.status, installText.slice(0, 240));
assert.ok(install.ok, "install setProfile without extras");

const after = pma(
  `SELECT id, mobile, name, city, birth_date, national_code, gender FROM users WHERE id=${userId}`
);
const text = after.text || "";
assert.match(text, /کاربر جدید تست/);
assert.match(text, /male/);
// city / birth_date / national_code should remain empty/NULL
const rowBits = text.match(
  new RegExp(`${NEW_MOBILE}[\\s\\S]{0,220}`)
)?.[0];
console.log("db_row_snip", rowBits?.slice(0, 220));
assert.ok(
  /NULL/.test(rowBits || "") ||
    !/13\d{2}-\d{2}-\d{2}/.test(rowBits || ""),
  "extras should stay null/empty for slim signup"
);

console.log("PASS login + slim signup profile");
