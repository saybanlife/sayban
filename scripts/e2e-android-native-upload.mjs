/**
 * Inject JWT into Android WebView CookieManager via CDP, then force native
 * FCM upload and verify DB for user 27 / 09228951264.
 *
 *   node scripts/e2e-android-native-upload.mjs
 */
import { spawnSync } from "node:child_process";
import http from "node:http";

const MOBILE = "09228951264";
const USER_ID = 27;
const ADB = process.env.ADB || "G:\\sdk\\platform-tools\\adb.exe";
const PKG = "com.insta.app";
const API_BASE = "https://sayban.darkube.ir/webhook/";
const resolveApiUrl = (path) =>
  new URL(String(path).replace(/^\//, ""), API_BASE).toString();

function sh(bin, args) {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  return { status: r.status ?? 1, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  return JSON.parse(r.stdout || "{}");
}

function extractCodeFromPma(text) {
  return String(text).match(/09228951264\s+(\d{4})\s+/)?.[1] || null;
}

function readDeviceFcmToken() {
  const r = sh(ADB, [
    "shell",
    "run-as",
    PKG,
    "cat",
    "/data/data/com.insta.app/shared_prefs/sayban_push.xml"
  ]);
  const m = r.stdout.match(/name="fcm_token">([^<]+)</);
  if (!m) throw new Error("no device fcm token");
  return m[1].trim();
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function cdp(wsUrl, method, params = {}) {
  const WS = globalThis.WebSocket;
  if (!WS) throw new Error("WebSocket global unavailable");
  return new Promise((resolve, reject) => {
    const ws = new WS(wsUrl);
    const id = 1;
    ws.addEventListener("open", () =>
      ws.send(JSON.stringify({ id, method, params }))
    );
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id === id) {
        ws.close();
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    ws.addEventListener("error", () => reject(new Error("ws error")));
    setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error("cdp timeout " + method));
    }, 15000);
  });
}

console.log("== OTP login ==");
await fetch(resolveApiUrl("/users/auth"), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mobile: MOBILE })
});
await new Promise((r) => setTimeout(r, 1500));
const otp = extractCodeFromPma(
  pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
  ).text || ""
);
if (!otp) throw new Error("no otp");
const val = await (
  await fetch(resolveApiUrl("/users/validate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE, code: otp })
  })
).json();
const jwt = val?.data?.token || val?.token;
if (!jwt) throw new Error("no jwt");
console.log("jwt_len", jwt.length);

const deviceToken = readDeviceFcmToken();
console.log("device_token_len", deviceToken.length);

console.log("== clear DB ==");
pma(`UPDATE users SET fcmToken = NULL WHERE id=${USER_ID}`);

// Ensure app foreground
sh(ADB, ["shell", "am", "start", "--user", "0", "-n", `${PKG}/.MainActivity`]);
await new Promise((r) => setTimeout(r, 3000));

const pid = sh(ADB, ["shell", "pidof", PKG]).stdout.trim().split(/\s+/)[0];
console.log("pid", pid);
if (!pid) throw new Error("app not running");

sh(ADB, ["forward", "--remove", "tcp:9222"]);
sh(ADB, [
  "forward",
  "tcp:9222",
  `localabstract:webview_devtools_remote_${pid}`
]);

const pages = await httpJson("http://127.0.0.1:9222/json");
const page = (pages || []).find(
  (p) =>
    String(p.url || "").includes("sayban") &&
    String(p.type || "") === "page" &&
    p.webSocketDebuggerUrl
);
if (!page) {
  console.error(
    "no sayban webview page",
    (pages || []).map((p) => ({ type: p.type, url: p.url }))
  );
  process.exit(2);
}
console.log("page", page.url);

const enc = encodeURIComponent(jwt);
const js = `
(function(){
  document.cookie = "token=${enc}; path=/; max-age=86400; SameSite=Lax";
  try {
    var b = window.SaybanAndroid || (window.__SAYBAN_NATIVE__ && window.__SAYBAN_NATIVE__.bridge);
    if (window.__saybanInitNativeFcm) return "init:" + String(window.__saybanInitNativeFcm());
    if (b && b.registerPushToken) { b.registerPushToken(); return "register"; }
    return "cookie-set-no-bridge";
  } catch(e) { return "err:" + e; }
})()`;

const evalResult = await cdp(page.webSocketDebuggerUrl, "Runtime.evaluate", {
  expression: js,
  returnByValue: true
});
console.log("js_result", evalResult?.result?.value);

sh(ADB, ["logcat", "-c"]);
// Also poke native sync by bringing activity to front again
sh(ADB, ["shell", "am", "start", "--user", "0", "-n", `${PKG}/.MainActivity`]);
await new Promise((r) => setTimeout(r, 5000));

const logs = sh(ADB, ["logcat", "-d", "-v", "time"]).stdout;
const uploadLines = logs
  .split(/\n/)
  .filter((l) => /SaybanPush|FCM token|token upload|SaybanMain/.test(l))
  .slice(-30);
console.log("== logcat ==");
for (const l of uploadLines) console.log(l);

await new Promise((r) => setTimeout(r, 2000));
const after = pma(
  `SELECT id, mobile, fcmToken, CHAR_LENGTH(IFNULL(fcmToken,'')) AS fcm_len, isnotif FROM users WHERE id=${USER_ID}`
);
const m = String(after.text || "").match(
  /09228951264\s+([A-Za-z0-9_.:%-]{20,})\s+(\d+)/
);
const dbToken = m?.[1] || null;
const dbLen = Number(m?.[2] || 0);
const match =
  dbToken === deviceToken ||
  (dbToken && deviceToken.startsWith(dbToken.slice(0, 24)));
const nativeUploadOk = /token upload status=200/.test(logs);

console.log({
  dbLen,
  dbPrefix: dbToken ? dbToken.slice(0, 24) : null,
  DB_MATCH: match,
  NATIVE_UPLOAD_200: nativeUploadOk
});

process.exit(match ? 0 : 5);
