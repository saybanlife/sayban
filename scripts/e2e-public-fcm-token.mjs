/**
 * E2E: public login (OTP) + setFcmToken DB write for mobile 09228951264.
 *   node --input-type=module scripts/e2e-public-fcm-token.mjs
 *
 * Steps:
 * 1) Snapshot current fcmToken for user 27
 * 2) POST users/auth → read OTP from users__sms_codes
 * 3) POST users/validate → JWT
 * 4) Clear fcmToken in DB
 * 5) POST setFcmToken with a marker (API path) OR print JWT for browser step
 * 6) Verify DB
 */
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PUBLIC_ROUTES } from "../src/lib/apiRoutes.ts";

const MOBILE = "09228951264";
const USER_ID = 27;

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  try {
    const j = JSON.parse(out);
    if (j.success === false) throw new Error(j.error || "pma error");
    return j;
  } catch (e) {
    if (String(e.message).includes("pma") || String(e.message).includes("#"))
      throw e;
    if (out.includes('"success": false')) throw new Error(out.slice(0, 400));
    return { raw: out, text: out };
  }
}

function extractField(text, field) {
  // phpMyAdmin HTML/text dump — find "field value" after header row is messy;
  // prefer matching known markers.
  const re = new RegExp(`${field}[^\\n]*\\n[^\\n]*?\\b([a-zA-Z0-9_.:-]{8,})\\b`);
  const m = String(text).match(re);
  return m?.[1] || null;
}

function extractFcmFromPma(text) {
  const m = String(text).match(
    /09228951264\s+(e2e-fcm-[a-zA-Z0-9_-]+|[A-Za-z0-9_.:-]{20,})\s+(\d+)/
  );
  if (m) return { token: m[1], len: Number(m[2]) };
  const m2 = String(text).match(/fcmToken[^]*?(e2e-fcm-[a-zA-Z0-9_-]+)/);
  if (m2) return { token: m2[1], len: m2[1].length };
  return null;
}

function extractCodeFromPma(text) {
  // rows like: 276 09228951264 9666
  const m = String(text).match(/09228951264\s+(\d{4})\s+/);
  return m?.[1] || null;
}

console.log("== snapshot ==");
const before = pma(
  `SELECT id, mobile, fcmToken, CHAR_LENGTH(IFNULL(fcmToken,'')) AS fcm_len, isnotif FROM users WHERE id=${USER_ID}`
);
console.log((before.text || "").match(/27[\s\S]{0,200}isnotif/)?.[0] || before.text?.slice(-400));

console.log("== send OTP ==");
const authUrl = resolveApiUrl("users/auth");
const authRes = await fetch(authUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ mobile: MOBILE })
});
const authText = await authRes.text();
console.log("auth", authRes.status, authText.slice(0, 300));

await new Promise(r => setTimeout(r, 1500));
const codes = pma(
  `SELECT id, mobile, code, timestamp FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
);
const otp = extractCodeFromPma(codes.text || "");
console.log("otp", otp);
if (!otp) {
  console.error("failed to read OTP from DB");
  process.exit(2);
}

console.log("== validate ==");
const validateUrl = resolveApiUrl("/users/validate");
const valRes = await fetch(validateUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ mobile: MOBILE, code: otp })
});
const valText = await valRes.text();
console.log("validate", valRes.status, valText.slice(0, 400));
let valJson = {};
try {
  valJson = JSON.parse(valText);
} catch {
  /* ignore */
}
const jwt =
  valJson?.data?.token ||
  valJson?.token ||
  valJson?.result?.token ||
  null;
if (!jwt) {
  console.error("no JWT from validate");
  process.exit(3);
}
console.log("jwt_len", jwt.length, "jwt_prefix", jwt.slice(0, 20));

console.log("== clear fcmToken ==");
pma(`UPDATE users SET fcmToken = NULL WHERE id=${USER_ID}`);

const marker = `e2e-fcm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
console.log("== POST setFcmToken marker ==");
const setUrl = resolveApiUrl(PUBLIC_ROUTES.setFcmToken);
const setRes = await fetch(setUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${jwt}`
  },
  body: JSON.stringify({
    token: marker,
    platform: "web",
    audience: "public"
  })
});
const setText = await setRes.text();
console.log("setFcm", setRes.status, setText.slice(0, 300));

const after = pma(
  `SELECT id, mobile, fcmToken, CHAR_LENGTH(IFNULL(fcmToken,'')) AS fcm_len, isnotif FROM users WHERE id=${USER_ID}`
);
const found = extractFcmFromPma(after.text || "");
const match = Boolean(found?.token === marker || (after.text || "").includes(marker));
console.log("DB_MATCH", match, found);
console.log("JWT_FOR_BROWSER", jwt);
process.exit(match && setRes.ok ? 0 : 4);
