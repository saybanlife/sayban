/**
 * E2E: create super_admin → add panel notif → list → seen → cleanup.
 *   node scripts/e2e-panel-notifications.mjs
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const SECRET = "21232f297a57a5a743894a0e4a801fc3";
const PASS = "NotifE2E!2026";
const stamp = Date.now();
const EMAIL = `notif_e2e_${stamp}@sayban.test`;
const MOBILE = `09${String(stamp).slice(-9)}`;
const hash = crypto.createHmac("sha256", SECRET).update(PASS).digest("hex");

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  if (r.status !== 0 || out.includes('"success": false')) {
    throw new Error(out.slice(0, 500) || r.stderr);
  }
  return out;
}

async function json(path, { method = "GET", token, body } = {}) {
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

pma(
  `INSERT INTO panel__users (full_name, mobile, email, password, role, is_active, isnotif)
   VALUES ('Notif E2E', '${MOBILE}', '${EMAIL}', '${hash}', 'super_admin', 1, 1)`
);

const login = await json("panel/user/login", {
  method: "POST",
  body: { userName: EMAIL, password: PASS }
});
const token = login.data?.result?.token;
const myId = Number(login.data?.result?.id || 0);
if (!token) {
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("login failed " + JSON.stringify(login.data));
}

// Resolve id from JWT if login payload omits it
let panelUserId = myId;
if (!panelUserId) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    );
    panelUserId = Number(payload.id) || 0;
  } catch {
    panelUserId = 0;
  }
}

const title = `اعلان تست ${stamp}`;
const add = await json(PANEL_ROUTES.notificationsAdd, {
  method: "POST",
  token,
  body: {
    title,
    text: "متن تست صندوق پنل",
    action: "/panel/dashboard",
    notification_type: "system",
    panel_user_id: panelUserId
  }
});
const id = Number(add.data?.result?.id);
if (!add.data?.success || !Number.isFinite(id)) {
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("add failed " + JSON.stringify(add.data));
}

const listed = await json(PANEL_ROUTES.notifications, { token });
const found = (listed.data?.result || []).find(n => Number(n.id) === id);
if (!found || found.title !== title) {
  pma(`DELETE FROM panel__notification WHERE id=${id}`);
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("listed missing new notif");
}

const seen = await json(PANEL_ROUTES.notificationsSeen, {
  method: "POST",
  token,
  body: { id }
});
if (!seen.data?.success) {
  pma(`DELETE FROM panel__notification WHERE id=${id}`);
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("seen failed " + JSON.stringify(seen.data));
}

const listed2 = await json(PANEL_ROUTES.notifications, { token });
const after = (listed2.data?.result || []).find(n => Number(n.id) === id);
if (!after || Number(after.is_seen) !== 1) {
  pma(`DELETE FROM panel__notification WHERE id=${id}`);
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("is_seen not updated");
}

pma(`DELETE FROM panel__notification WHERE id=${id}`);
pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);

console.log(
  JSON.stringify({ ok: true, id, title, panelUserId, listCount: (listed.data?.result || []).length }, null, 2)
);
