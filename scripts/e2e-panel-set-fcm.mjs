import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const SECRET = "21232f297a57a5a743894a0e4a801fc3";
const PASS = "PanelFcmTest!2026";
const EMAIL = `fcm_test_${Date.now()}@sayban.test`;
const MOBILE = `09${String(Date.now()).slice(-9)}`;
const hash = crypto.createHmac("sha256", SECRET).update(PASS).digest("hex");

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "pma failed");
  const out = r.stdout || "";
  // success flag in JSON
  try {
    const j = JSON.parse(out);
    if (j.success === false) throw new Error(j.error || "pma error");
    return j;
  } catch (e) {
    if (String(e.message).includes("pma")) throw e;
    // sometimes mixed; check fail marker
    if (out.includes('"success": false') || out.includes("status\": \"fail\"")) {
      throw new Error(out.slice(0, 400));
    }
    return { raw: out };
  }
}

console.log("creating user", EMAIL, MOBILE);
pma(
  `INSERT INTO panel__users (full_name, mobile, email, password, role, is_active, isnotif)
   VALUES ('FCM Test User', '${MOBILE}', '${EMAIL}', '${hash}', 'staff', 1, 1)`
);

const loginUrl = resolveApiUrl("panel/user/login");
const loginRes = await fetch(loginUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ userName: EMAIL, password: PASS })
});
const loginText = await loginRes.text();
console.log("login status", loginRes.status, loginText.slice(0, 400));
let loginJson = {};
try {
  loginJson = JSON.parse(loginText);
} catch {
  loginJson = {};
}
const token =
  loginJson?.result?.token ||
  loginJson?.token ||
  loginJson?.data?.token ||
  loginJson?.result?.accessToken ||
  null;
if (!token) {
  console.error("no token; abort cleanup");
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  process.exit(1);
}

const fakeFcm = `test-panel-fcm-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
const setUrl = resolveApiUrl(PANEL_ROUTES.setFcmToken);
const setRes = await fetch(setUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({ token: fakeFcm, platform: "web", audience: "panel" })
});
const setText = await setRes.text();
console.log("setFcm status", setRes.status, setText.slice(0, 500));

const verify = pma(
  `SELECT id, email, fcmToken, isnotif FROM panel__users WHERE email='${EMAIL}' LIMIT 1`
);
console.log("verify text snippet:", String(verify.text || "").slice(0, 600));

const match = String(verify.text || "").includes(fakeFcm);
console.log("DB_MATCH", match);

pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
console.log("cleaned up");
process.exit(match && setRes.ok ? 0 : 2);
