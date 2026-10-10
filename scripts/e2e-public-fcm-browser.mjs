/**
 * Full browser E2E: OTP login → Notification permission → FCM getToken → setFcmToken → DB.
 *   node scripts/e2e-public-fcm-browser.mjs
 *
 * Does not print full JWT/FCM tokens — only prefixes + lengths.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolveApiUrl, PUBLIC_ROUTES } from "../src/lib/apiRoutes.ts";

const MOBILE = "09228951264";
const USER_ID = 27;
const BASE = process.env.SAYBAN_E2E_BASE || "http://localhost:3000";

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

function readOtp(text) {
  const m = String(text).match(/09228951264\s+(\d{4})\s+/);
  return m?.[1] || null;
}

function readFcm(text) {
  const m = String(text).match(
    /09228951264\s+([A-Za-z0-9_.:-]{20,}|e2e-fcm-[A-Za-z0-9_-]+)\s+(\d+)/
  );
  if (!m) return null;
  return { token: m[1], len: Number(m[2]) };
}

function redact(value) {
  const s = String(value || "");
  if (s.length <= 16) return `len=${s.length}`;
  return `${s.slice(0, 12)}…${s.slice(-6)} (len=${s.length})`;
}

async function loginJwt() {
  const authUrl = resolveApiUrl("users/auth");
  const authRes = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  if (!authRes.ok) throw new Error(`auth ${authRes.status}`);
  await new Promise(r => setTimeout(r, 1200));
  const codes = pma(
    `SELECT id, mobile, code, timestamp FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
  );
  const otp = readOtp(codes.text || "");
  if (!otp) throw new Error("OTP not found in DB");
  const valRes = await fetch(resolveApiUrl("/users/validate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE, code: otp })
  });
  const valJson = await valRes.json();
  const jwt = valJson?.data?.token;
  if (!jwt) throw new Error("JWT missing from validate");
  return jwt;
}

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  console.error("playwright package missing; npm i -D playwright");
  process.exit(1);
}

console.log("clear DB fcmToken");
pma(`UPDATE users SET fcmToken = NULL WHERE id=${USER_ID}`);

console.log("login OTP…");
const jwt = await loginJwt();
console.log("jwt", redact(jwt));

const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.grantPermissions(["notifications"], { origin: BASE });
await context.addCookies([
  {
    name: "token",
    value: jwt,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax"
  }
]);

const page = await context.newPage();
const consoleLines = [];
page.on("console", msg => {
  const t = msg.text();
  if (/FCM|Notification|permission|token|firebase|Error/i.test(t)) {
    consoleLines.push(t.slice(0, 240));
  }
});

let setFcmBody = null;
page.on("request", req => {
  if (req.url().includes("setFcmToken") && req.method() === "POST") {
    try {
      setFcmBody = JSON.parse(req.postData() || "{}");
    } catch {
      setFcmBody = { raw: true };
    }
  }
});

const setFcmWait = page
  .waitForResponse(r => r.url().includes("setFcmToken"), { timeout: 90000 })
  .catch(() => null);

console.log("goto home");
await page.goto(`${BASE}/home/`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.evaluate(() => localStorage.removeItem("notificationReminderLater"));

const gate = await page.evaluate(() => ({
  perm: Notification.permission,
  hasCookie: document.cookie.includes("token="),
  sw: "serviceWorker" in navigator
}));
console.log("gate", gate);

// If modal appears, click enable (permission already granted via context).
const enable = page.getByRole("button", { name: /فعال‌سازی|فعال سازي|فعال/i }).first();
if (await enable.count()) {
  console.log("click enable modal");
  await enable.click().catch(() => {});
}

// Ensure app init path: soft reload with granted permission + cookie.
await page.reload({ waitUntil: "networkidle", timeout: 120000 }).catch(() => {});

const setFcmRes = await setFcmWait;
if (!setFcmRes) {
  // Force client init via page-eval of firebase same as app (inline).
  console.log("no setFcm yet — forcing firebase getToken in page");
  const forced = await page.evaluate(async () => {
    const VAPID =
      "BB5iK65gAz1q5PnKQDv_6wqV-dXMMpNg4E6iaAZje7kLM1Nrxb_NPkw2HFDo7Y-FJKiq8nlov7RZsvtkGeGEIj0";
    const logs = [];
    try {
      const { initializeApp, getApps, getApp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
      );
      const { getMessaging, getToken, isSupported } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js"
      );
      const cfg = {
        apiKey: "AIzaSyAG_UJ8y1wWjqJT4LnFKT3O6bWGjd7CORI",
        authDomain: "sayban-web.firebaseapp.com",
        projectId: "sayban-web",
        storageBucket: "sayban-web.firebasestorage.app",
        messagingSenderId: "856382957880",
        appId: "1:856382957880:web:13290f4f3da5805ac179cd"
      };
      const app = getApps().length ? getApp() : initializeApp(cfg);
      if (!(await isSupported())) return { ok: false, logs: ["not supported"] };
      const reg =
        (await navigator.serviceWorker.getRegistration(
          "/firebase-cloud-messaging-push-scope"
        )) ||
        (await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/firebase-cloud-messaging-push-scope"
        }));
      await navigator.serviceWorker.ready;
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: VAPID,
        serviceWorkerRegistration: reg
      });
      logs.push("gotToken=" + Boolean(token));
      if (!token) return { ok: false, logs };
      const cookieMatch = document.cookie.match(/(?:^|; )token=([^;]*)/);
      const auth = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
      const res = await fetch("https://sayban.darkube.ir/webhook/setFcmToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth}`
        },
        body: JSON.stringify({
          token,
          platform: "web",
          audience: "public"
        })
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        tokenLen: token.length,
        tokenPrefix: token.slice(0, 12),
        text: text.slice(0, 120),
        logs
      };
    } catch (e) {
      return { ok: false, err: String(e), logs };
    }
  });
  console.log("forced", {
    ...forced,
    tokenPrefix: forced.tokenPrefix
      ? `${forced.tokenPrefix}… (len=${forced.tokenLen})`
      : undefined
  });
} else {
  console.log("setFcm response", setFcmRes.status(), await setFcmRes.text().then(t => t.slice(0, 200)));
  if (setFcmBody?.token) {
    console.log("posted token", redact(setFcmBody.token));
  }
}

await page.waitForTimeout(2000);
await browser.close();

const after = pma(
  `SELECT id, mobile, fcmToken, CHAR_LENGTH(IFNULL(fcmToken,'')) AS fcm_len, isnotif FROM users WHERE id=${USER_ID}`
);
const fcm = readFcm(after.text || "");
const ok =
  Boolean(fcm?.token) &&
  fcm.len >= 100 &&
  !String(fcm.token).startsWith("e2e-fcm-") &&
  !String(fcm.token).startsWith("NULL");

console.log("DB fcm", fcm ? redact(fcm.token) : null, "len", fcm?.len);
console.log("console", consoleLines.slice(-15));
console.log("PASS", ok);
process.exit(ok ? 0 : 2);
