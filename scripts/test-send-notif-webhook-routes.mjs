/**
 * Smoke: Send Notif page routes resolve to webhook base (not app origin),
 * and n8n send-notif / send-notif-panel accept the panel payload shape.
 *
 *   node scripts/test-send-notif-webhook-routes.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { PANEL_ROUTES, resolveApiUrl, API_BASE_URL } from "../src/lib/apiRoutes.ts";

assert.equal(PANEL_ROUTES.sendNotif, "send-notif");
assert.equal(PANEL_ROUTES.sendNotifPanel, "send-notif-panel");
assert.match(resolveApiUrl(PANEL_ROUTES.sendNotif), /^https?:\/\//);
assert.ok(resolveApiUrl(PANEL_ROUTES.sendNotif).startsWith(API_BASE_URL));
assert.ok(
  resolveApiUrl(PANEL_ROUTES.sendNotifPanel).startsWith(API_BASE_URL)
);
assert.equal(
  resolveApiUrl(PANEL_ROUTES.sendNotif).includes("/api/panel/notifications/send"),
  false
);

const stamp = Date.now();
const title = `send-notif-smoke-${stamp}`;
const text = "smoke test — safe to delete";

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  if (r.status !== 0 || out.includes('"success": false')) {
    throw new Error(out.slice(0, 400) || r.stderr);
  }
  return out;
}

const appRes = await fetch(resolveApiUrl(PANEL_ROUTES.sendNotif), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title,
    text,
    action: "/",
    notification_type: "system",
    audience: "users",
    userIds: [999999001],
    isSendNow: true,
    isSaveData: true,
    sentAt: new Date().toISOString()
  })
});
const appJson = await appRes.json().catch(() => ({}));
assert.equal(appRes.ok, true, `send-notif HTTP ${appRes.status}`);
assert.notEqual(appJson?.success, false);

const panelRes = await fetch(resolveApiUrl(PANEL_ROUTES.sendNotifPanel), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title,
    text,
    action: "/panel/notifications",
    notification_type: "system",
    audience: "panel_users",
    userIds: [999999001],
    panelUserIds: [999999001],
    isSendNow: true,
    isSaveData: true,
    sentAt: new Date().toISOString()
  })
});
const panelJson = await panelRes.json().catch(() => ({}));
assert.equal(panelRes.ok, true, `send-notif-panel HTTP ${panelRes.status}`);
assert.notEqual(panelJson?.success, false);

try {
  pma(
    `DELETE FROM users__notification WHERE title='${title.replace(/'/g, "''")}'`
  );
  pma(
    `DELETE FROM panel__notification WHERE title='${title.replace(/'/g, "''")}'`
  );
} catch (error) {
  console.warn("cleanup warning:", error instanceof Error ? error.message : error);
}

console.log("send-notif webhook route tests passed", {
  appUrl: resolveApiUrl(PANEL_ROUTES.sendNotif),
  panelUrl: resolveApiUrl(PANEL_ROUTES.sendNotifPanel),
  appSuccess: appJson?.success ?? true,
  panelSuccess: panelJson?.success ?? true
});
