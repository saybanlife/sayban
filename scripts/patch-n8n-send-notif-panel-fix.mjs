/**
 * Fix `send-notif-panel` in n8n `notification` workflow:
 * - Save into `panel__notification` (not `panel__users`)
 * - Expand rows with `panel_user_id` (supports panelUserIds / userIds / 0 broadcast)
 * - Load FCM tokens by `panel__users.id` (not center_id)
 * - Respond with `{ success, result }`
 *
 *   node scripts/patch-n8n-send-notif-panel-fix.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const WORKFLOW_ID = "YHmCK0NHUpyMH2jX";
const MYSQL_CREDENTIALS = {
  mySql: { id: "oNRa6pdlbbcsx18m", name: "MySQL account" }
};

function readEnv() {
  const envPath = path.join(
    process.cwd(),
    ".cursor/sayban-ops/secrets/n8n_sayban.env"
  );
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

const EXPAND_PANEL = `const body = $('notif1').first().json.body || {};
const title = String(body.title || '');
const text = String(body.text || '');
const action = String(body.action || '/') || '/';
const notification_type = String(body.notification_type || 'system');
const rawIds = Array.isArray(body.panelUserIds)
  ? body.panelUserIds
  : Array.isArray(body.userIds)
    ? body.userIds
    : body.panel_user_id != null
      ? [body.panel_user_id]
      : body.userId != null
        ? [body.userId]
        : [];
const ids = rawIds.map(Number).filter((id) => Number.isFinite(id));
const unique = [...new Set(ids.filter((id) => id === 0 || id > 0))];
if (unique.length === 0) {
  return [{ json: { title, text, action, notification_type, panel_user_id: 0 } }];
}
return unique.map((panel_user_id) => ({
  json: { title, text, action, notification_type, panel_user_id }
}));`;

const RESPOND_WRAP = `const body = $('notif1').first().json.body || {};
const audience = String(body.audience || 'panel');
const ids = Array.isArray(body.panelUserIds)
  ? body.panelUserIds
  : Array.isArray(body.userIds)
    ? body.userIds
    : [];
return [{
  json: {
    success: true,
    result: {
      audience,
      panelUserIds: audience === 'panel_users' ? ids : undefined,
      broadcast: audience === 'panel' || (Array.isArray(ids) && ids.length === 1 && Number(ids[0]) === 0),
      savedToInbox: body.isSaveData !== false,
      topic: body.topic || undefined
    }
  }
}];`;

const TOKEN_SQL = `={{
(() => {
  const body = $('notif1').item.json.body || {};
  const raw = Array.isArray(body.panelUserIds)
    ? body.panelUserIds
    : Array.isArray(body.userIds)
      ? body.userIds
      : body.userId != null
        ? [body.userId]
        : [0];
  const ids = [...new Set(raw.map(Number).filter((id) => Number.isFinite(id) && (id === 0 || id > 0)))];
  const broadcast = ids.length === 0 || (ids.length === 1 && ids[0] === 0);
  if (broadcast) {
    return \`SELECT fcmToken FROM panel__users WHERE is_active = 1 AND fcmToken IS NOT NULL AND fcmToken <> ''\`;
  }
  return \`SELECT fcmToken FROM panel__users WHERE id IN (\${ids.join(',')}) AND fcmToken IS NOT NULL AND fcmToken <> ''\`;
})()
}}`;

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const loginRes = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!loginRes.ok) throw new Error(`login ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const detail = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `notification-send-notif-panel-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const connections = JSON.parse(JSON.stringify(wf.connections));

const expand = nodes.find(n => n.name === "Expand Notif Rows1");
if (!expand) throw new Error("Expand Notif Rows1 missing");
expand.parameters.jsCode = EXPAND_PANEL;

const save = nodes.find(n => n.name === "Save Notification1");
if (!save) throw new Error("Save Notification1 missing");
save.parameters = {
  table: {
    __rl: true,
    value: "panel__notification",
    mode: "list",
    cachedResultName: "panel__notification"
  },
  dataMode: "defineBelow",
  valuesToSend: {
    values: [
      { column: "title", value: "={{ $json.title }}" },
      { column: "text", value: "={{ $json.text }}" },
      { column: "panel_user_id", value: "={{ $json.panel_user_id }}" },
      { column: "notification_type", value: "={{ $json.notification_type }}" },
      { column: "action", value: "={{ $json.action }}" },
      { column: "is_seen", value: "={{ 0 }}" }
    ]
  },
  options: {}
};
save.credentials = save.credentials || MYSQL_CREDENTIALS;
save.alwaysOutputData = true;
save.onError = "continueRegularOutput";

const tokenMysql = nodes.find(n => n.name === "MySQL2");
if (!tokenMysql) throw new Error("MySQL2 missing");
tokenMysql.parameters = {
  operation: "executeQuery",
  query: TOKEN_SQL,
  options: {}
};
tokenMysql.credentials = tokenMysql.credentials || MYSQL_CREDENTIALS;
tokenMysql.executeOnce = true;
tokenMysql.alwaysOutputData = true;

let wrap = nodes.find(n => n.name === "send_notif_panel_wrap");
if (!wrap) {
  const respond = nodes.find(n => n.name === "Respond to Webhook1");
  const [rx, ry] = respond?.position || [1200, 400];
  wrap = {
    parameters: { jsCode: RESPOND_WRAP },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [rx - 200, ry],
    id: randomUUID(),
    name: "send_notif_panel_wrap"
  };
  nodes.push(wrap);
} else {
  wrap.parameters.jsCode = RESPOND_WRAP;
}

// Ensure push/save paths end at wrap → respond with success JSON
connections["HTTP Request1"] = {
  main: [[{ node: "send_notif_panel_wrap", type: "main", index: 0 }]]
};
connections["HTTP Request16"] = {
  main: [[{ node: "send_notif_panel_wrap", type: "main", index: 0 }]]
};
connections["HTTP Request17"] = {
  main: [[{ node: "send_notif_panel_wrap", type: "main", index: 0 }]]
};
connections["HTTP Request18"] = {
  main: [[{ node: "send_notif_panel_wrap", type: "main", index: 0 }]]
};
connections["Save Notification1"] = {
  main: [[{ node: "MySQL2", type: "main", index: 0 }]]
};
connections["MySQL2"] = {
  main: [[{ node: "Parse DB Tokens", type: "main", index: 0 }]]
};
connections["send_notif_panel_wrap"] = {
  main: [[{ node: "Respond to Webhook1", type: "main", index: 0 }]]
};

// Also wrap user send-notif respond when possible
let userWrap = nodes.find(n => n.name === "send_notif_wrap");
const USER_WRAP = `const body = $('notif').first().json.body || {};
const audience = String(body.audience || (body.topic ? 'all' : 'users'));
const ids = Array.isArray(body.userIds) ? body.userIds : [];
return [{
  json: {
    success: true,
    result: {
      audience,
      userIds: audience === 'users' ? ids : undefined,
      topic: body.topic || undefined,
      savedToInbox: body.isSaveData !== false
    }
  }
}];`;
if (!userWrap) {
  const respond = nodes.find(n => n.name === "Respond to Webhook");
  const [rx, ry] = respond?.position || [1200, 0];
  userWrap = {
    parameters: { jsCode: USER_WRAP },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [rx - 200, ry],
    id: randomUUID(),
    name: "send_notif_wrap"
  };
  nodes.push(userWrap);
} else {
  userWrap.parameters.jsCode = USER_WRAP;
}

for (const name of [
  "HTTP Request",
  "HTTP Request13",
  "HTTP Request14",
  "HTTP Request15"
]) {
  if (connections[name]) {
    connections[name] = {
      main: [[{ node: "send_notif_wrap", type: "main", index: 0 }]]
    };
  }
}
connections["send_notif_wrap"] = {
  main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]]
};

const patch = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {},
    staticData: wf.staticData,
    active: true
  })
});
if (!patch.ok) throw new Error(`patch ${patch.status} ${await patch.text()}`);
console.log(
  "patched send-notif-panel → panel__notification + id-based FCM + success wraps"
);
