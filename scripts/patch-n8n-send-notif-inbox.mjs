/**
 * Fix send-notif inbox: expand userIds to one insert each, keep token SELECT once.
 *
 *   node scripts/patch-n8n-send-notif-inbox.mjs
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
    `notification-send-notif-inbox-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const connections = JSON.parse(JSON.stringify(wf.connections));

const save = nodes.find(n => n.name === "Save Notification");
if (!save) throw new Error("Save Notification missing");
const [sx, sy] = save.position;

// Ensure Save is a per-item insert from json fields produced by Expand
save.parameters = {
  table: {
    __rl: true,
    value: "users__notification",
    mode: "list",
    cachedResultName: "users__notification"
  },
  dataMode: "defineBelow",
  valuesToSend: {
    values: [
      { column: "title", value: "={{ $json.title }}" },
      { column: "text", value: "={{ $json.text }}" },
      { column: "userId", value: "={{ $json.userId }}" },
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

let expand = nodes.find(n => n.name === "Expand Notif Rows");
if (!expand) {
  expand = {
    parameters: {
      jsCode: `const body = $('notif').first().json.body || {};
const title = String(body.title || '');
const text = String(body.text || '');
const action = String(body.action || '/') || '/';
const notification_type = String(body.notification_type || 'system');
const ids = Array.isArray(body.userIds)
  ? body.userIds.map(Number).filter((id) => Number.isFinite(id))
  : body.userId != null
    ? [Number(body.userId)]
    : [];
const unique = [...new Set(ids.filter((id) => id === 0 || id > 0))];
if (unique.length === 0) {
  return [{ json: { title, text, action, notification_type, userId: 0 } }];
}
return unique.map((userId) => ({
  json: { title, text, action, notification_type, userId }
}));`
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [sx - 220, sy],
    id: randomUUID(),
    name: "Expand Notif Rows"
  };
  nodes.push(expand);
} else {
  expand.parameters.jsCode = `const body = $('notif').first().json.body || {};
const title = String(body.title || '');
const text = String(body.text || '');
const action = String(body.action || '/') || '/';
const notification_type = String(body.notification_type || 'system');
const ids = Array.isArray(body.userIds)
  ? body.userIds.map(Number).filter((id) => Number.isFinite(id))
  : body.userId != null
    ? [Number(body.userId)]
    : [];
const unique = [...new Set(ids.filter((id) => id === 0 || id > 0))];
if (unique.length === 0) {
  return [{ json: { title, text, action, notification_type, userId: 0 } }];
}
return unique.map((userId) => ({
  json: { title, text, action, notification_type, userId }
}));`;
}

const tokenMysql = nodes.find(n => n.name === "MySQL");
if (tokenMysql) {
  tokenMysql.executeOnce = true;
  tokenMysql.alwaysOutputData = true;
}

// If → Expand → Save → MySQL
connections["If"] = {
  main: [
    [{ node: "Expand Notif Rows", type: "main", index: 0 }],
    [{ node: "Switch", type: "main", index: 0 }]
  ]
};
connections["Expand Notif Rows"] = {
  main: [[{ node: "Save Notification", type: "main", index: 0 }]]
};
connections["Save Notification"] = {
  main: [[{ node: "MySQL", type: "main", index: 0 }]]
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
console.log("patched Expand Notif Rows + Save Notification");
