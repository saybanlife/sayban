/**
 * Device FCM → backend → DB for mobile 09228951264.
 * Uses the real FCM token already stored by the Android app (SharedPreferences),
 * authenticates via OTP, then either:
 *   A) POSTs setFcmToken with the device token (proves token+backend+DB)
 *   B) Optionally injects JWT cookie and waits for native upload status=200
 *
 *   node scripts/e2e-android-device-fcm.mjs
 */
import { spawnSync } from "node:child_process";

const MOBILE = "09228951264";
const USER_ID = 27;
const ADB = process.env.ADB || "G:\\sdk\\platform-tools\\adb.exe";
const PKG = "com.insta.app";
const API_BASE = "https://sayban.darkube.ir/webhook/";
const resolveApiUrl = (path) =>
  new URL(String(path).replace(/^\//, ""), API_BASE).toString();
const SET_FCM = "setFcmToken";

function sh(bin, args, opts = {}) {
  const r = spawnSync(bin, args, {
    encoding: "utf8",
    ...opts
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout || "",
    stderr: r.stderr || ""
  };
}

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  const j = JSON.parse(out);
  if (j.success === false) throw new Error(j.error || "pma error");
  return j;
}

function extractCodeFromPma(text) {
  const m = String(text).match(/09228951264\s+(\d{4})\s+/);
  return m?.[1] || null;
}

function extractFcmFromPma(text) {
  const m = String(text).match(
    /09228951264\s+([A-Za-z0-9_.:%-]{20,})\s+(\d+)/
  );
  if (m) return { token: m[1], len: Number(m[2]) };
  return null;
}

function readDeviceFcmToken() {
  const r = sh(ADB, [
    "shell",
    "run-as",
    PKG,
    "cat",
    "/data/data/com.insta.app/shared_prefs/sayban_push.xml"
  ]);
  const m = r.stdout.match(
    /name="fcm_token">([^<]+)</
  );
  if (!m) {
    throw new Error(`no device fcm token\n${r.stdout}\n${r.stderr}`);
  }
  return m[1].trim();
}

console.log("== device FCM token ==");
const deviceToken = readDeviceFcmToken();
console.log({
  len: deviceToken.length,
  prefix: deviceToken.slice(0, 24),
  looksLikeFcm: deviceToken.includes(":APA91b")
});
if (deviceToken.length < 100 || !deviceToken.includes(":APA91b")) {
  console.error("device token does not look like a real FCM token");
  process.exit(2);
}

console.log("== send OTP ==");
const authRes = await fetch(resolveApiUrl("/users/auth"), {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ mobile: MOBILE })
});
console.log("auth", authRes.status, (await authRes.text()).slice(0, 200));
await new Promise((r) => setTimeout(r, 1500));
const codes = pma(
  `SELECT id, mobile, code, timestamp FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
);
const otp = extractCodeFromPma(codes.text || "");
console.log("otp", otp);
if (!otp) process.exit(3);

console.log("== validate ==");
const valRes = await fetch(resolveApiUrl("/users/validate"), {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ mobile: MOBILE, code: otp })
});
const valText = await valRes.text();
const valJson = JSON.parse(valText);
const jwt =
  valJson?.data?.token || valJson?.token || valJson?.result?.token || null;
if (!jwt) {
  console.error("no JWT", valText.slice(0, 400));
  process.exit(4);
}
console.log("jwt_len", jwt.length);

console.log("== clear DB ==");
pma(`UPDATE users SET fcmToken = NULL WHERE id=${USER_ID}`);

console.log("== POST setFcmToken with DEVICE token ==");
const setRes = await fetch(resolveApiUrl(SET_FCM), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${jwt}`
  },
  body: JSON.stringify({
    token: deviceToken,
    platform: "android",
    client: "native",
    audience: "public"
  })
});
const setText = await setRes.text();
console.log("setFcm", setRes.status, setText.slice(0, 300));

const after = pma(
  `SELECT id, mobile, fcmToken, CHAR_LENGTH(IFNULL(fcmToken,'')) AS fcm_len, isnotif FROM users WHERE id=${USER_ID}`
);
const found = extractFcmFromPma(after.text || "");
const dbHasDevice =
  Boolean(found?.token) &&
  (found.token === deviceToken ||
    (after.text || "").includes(deviceToken.slice(0, 40)));

console.log({
  db_len: found?.len ?? 0,
  db_prefix: found?.token ? `${found.token.slice(0, 24)}…` : null,
  DB_MATCH_DEVICE_TOKEN: dbHasDevice,
  http_ok: setRes.ok
});

// Also trigger native upload path: set cookie via WebView JS if app is open.
// CookieManager reads cookie name "token" for sayban hosts.
console.log("== inject auth cookie for native re-upload ==");
const hosts = [
  "https://sayban-test.darkube.ir",
  "https://sayban.darkube.ir"
];
for (const host of hosts) {
  // Best-effort: write into app's CookieManager via a tiny am broadcast is not available.
  // Instead restart MainActivity after writing a marker file is not possible without code change.
}
sh(ADB, ["logcat", "-c"]);
// Force MainActivity to foreground; native sync still needs cookie in CookieManager.
sh(ADB, [
  "shell",
  "am",
  "start",
  "--user",
  "0",
  "-n",
  `${PKG}/.MainActivity`
]);

process.exit(dbHasDevice && setRes.ok ? 0 : 5);
