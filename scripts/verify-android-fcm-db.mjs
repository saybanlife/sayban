/**
 * Android FCM verification helper (DB-side).
 * After granting notifications in the app while logged in as 09228951264:
 *   node scripts/verify-android-fcm-db.mjs
 */
import { spawnSync } from "node:child_process";

const USER_ID = 27;
const MOBILE = "09228951264";

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const j = JSON.parse(r.stdout || "{}");
  if (j.success === false) throw new Error(j.error || "pma failed");
  return j;
}

const before = pma(
  `SELECT id, mobile, fcmToken, CHAR_LENGTH(IFNULL(fcmToken,'')) AS fcm_len, isnotif FROM users WHERE id=${USER_ID}`
);
const text = before.text || "";
const m = text.match(
  new RegExp(`${MOBILE}\\s+([A-Za-z0-9_.:%-]{20,}|NULL)\\s+(\\d+)`)
);
const token = m?.[1];
const len = Number(m?.[2] || 0);
const ok =
  Boolean(token) &&
  token !== "NULL" &&
  len >= 100 &&
  !token.startsWith("e2e-fcm-");

console.log({
  userId: USER_ID,
  mobile: MOBILE,
  tokenPrefix: token && token !== "NULL" ? `${token.slice(0, 16)}…` : token,
  len,
  pass: ok
});
process.exit(ok ? 0 : 2);
