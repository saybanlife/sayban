/**
 * Verify Reminder auth headers match Homepage:
 *   Authorization: Bearer <jwt>
 *
 *   node scripts/test-reminder-auth-headers.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";

/** Mirror of mergePublicAuthHeaders (no DOM cookie). */
function mergePublicAuthHeaders(config, explicitToken) {
  const base = config && typeof config === "object" ? { ...config } : {};
  const headers = {
    ...((base.headers && typeof base.headers === "object" ? base.headers : {}) ||
      {})
  };
  const existingRaw =
    headers.Authorization || headers.authorization || headers.AUTHORIZATION || "";
  const strip = (v) => {
    let out = String(v || "").trim();
    while (/^Bearer\s+/i.test(out)) out = out.replace(/^Bearer\s+/i, "").trim();
    return out;
  };
  const token = strip(existingRaw) || strip(explicitToken);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    delete headers.authorization;
    delete headers.AUTHORIZATION;
  }
  return { ...base, headers };
}

function pma(sql) {
  const r = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
  const j = JSON.parse((r.stdout || "").trim());
  if (j.success === false) throw new Error(j.error || "pma failed");
  return j;
}

function extractOtp(text, mobile) {
  return String(text).match(new RegExp(`${mobile}\\s+(\\d{4})\\s+`))?.[1] || null;
}

async function otpLogin(mobile) {
  await fetch(new URL("users/auth", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile })
  });
  await new Promise((r) => setTimeout(r, 1500));
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${mobile}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", mobile);
  assert.ok(otp, "otp");
  const valRes = await fetch(new URL("users/validate", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, code: otp })
  });
  const val = await valRes.json();
  const token = val?.data?.token || val?.token;
  assert.ok(token, "jwt");
  return token;
}

console.log("== unit: homepage-style Bearer normalization ==");
const raw = "abc.def.ghi";
const fromHomepage = mergePublicAuthHeaders({
  headers: { Authorization: `Bearer ${raw}` }
});
assert.equal(fromHomepage.headers.Authorization, `Bearer ${raw}`);

const fromCreditBug = mergePublicAuthHeaders({
  headers: { authorization: raw }
});
assert.equal(fromCreditBug.headers.Authorization, `Bearer ${raw}`);
assert.equal(fromCreditBug.headers.authorization, undefined);

const fromPropOnly = mergePublicAuthHeaders({}, raw);
assert.equal(fromPropOnly.headers.Authorization, `Bearer ${raw}`);

const doubleBearer = mergePublicAuthHeaders({
  headers: { Authorization: `Bearer Bearer ${raw}` }
});
assert.equal(doubleBearer.headers.Authorization, `Bearer ${raw}`);

console.log("== e2e: JWT list with Homepage Authorization header ==");
const token = await otpLogin(MOBILE);
const homepageStyle = mergePublicAuthHeaders(
  { headers: { Authorization: `Bearer ${token}` } },
  null
);
assert.equal(
  homepageStyle.headers.Authorization,
  `Bearer ${token}`,
  "header must be Bearer + raw jwt"
);
assert.ok(
  !homepageStyle.headers.Authorization.includes("Bearer Bearer"),
  "no double Bearer"
);

const list = await fetch(new URL("user/task/list", API), {
  method: "GET",
  headers: {
    Accept: "application/json",
    ...homepageStyle.headers
  }
});
const listJson = await list.json();
console.log("list", list.status, {
  success: listJson.success,
  count: listJson.reminders?.length ?? listJson.result?.length
});
assert.equal(list.status, 200);
assert.equal(listJson.success, true);

const walletStyle = mergePublicAuthHeaders({ headers: { authorization: token } });
assert.equal(walletStyle.headers.Authorization, `Bearer ${token}`);
const wallet = await fetch(new URL("wallet", API), {
  headers: { ...walletStyle.headers }
});
const walletJson = await wallet.json();
console.log("wallet", wallet.status, walletJson);
assert.equal(wallet.status, 200);
assert.equal(walletJson.success, true);

console.log("PASS reminder auth headers match homepage Bearer pattern");
