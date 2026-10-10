/**
 * Adds support callback create + panel list webhooks to n8n `users` workflow.
 *
 *   POST support/callbacks/create
 *   GET  panel/support/callbacks
 *
 *   node scripts/patch-n8n-support-callbacks.mjs
 *   node scripts/patch-n8n-support-callbacks.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "users";
const revert = process.argv.includes("--revert");

const CREATE_WH = "support-callbacks create";
const LIST_WH = "panel-support-callbacks";

const ADDED = [
  CREATE_WH,
  "support_cb_auth",
  "support_cb_insert",
  "support_cb_select",
  "support_cb_format",
  "support_cb_respond",
  LIST_WH,
  "support_cb_panel_auth",
  "support_cb_panel_select",
  "support_cb_panel_format",
  "support_cb_panel_respond"
];

const AUTH_CREATE_JS = `const raw = $input.first().json || {};
const jwtUserId = Number(raw.jwtPayload?.id);
if (!Number.isFinite(jwtUserId) || jwtUserId <= 0) {
  throw new Error("کاربر نامعتبر است.");
}
const body = raw.body && typeof raw.body === "object" ? raw.body : {};
const phone = String(body.phone || "").replace(/\\D/g, "");
if (!/^09\\d{9}$/.test(phone)) throw new Error("شماره تماس معتبر نیست.");
const timePreference = body.time_preference === "specific" ? "specific" : "anytime";
let preferredTime = null;
if (timePreference === "specific") {
  const match = String(body.preferred_time || "").trim().match(/^(\\d{1,2}):(\\d{2})$/);
  if (!match) throw new Error("ساعت تماس را مشخص کنید.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("ساعت تماس معتبر نیست.");
  }
  preferredTime = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}
const source = String(body.source || "nurse_request").slice(0, 64);
return [{
  json: {
    user_id: jwtUserId,
    phone,
    time_preference: timePreference,
    preferred_time: preferredTime,
    source
  }
}];
`;

const FORMAT_CREATE_JS = `const row = $input.first().json || {};
return [{
  json: {
    success: true,
    result: {
      id: Number(row.id),
      user_id: Number(row.user_id),
      phone: String(row.phone || ""),
      time_preference: row.time_preference === "specific" ? "specific" : "anytime",
      preferred_time: row.preferred_time != null ? String(row.preferred_time) : null,
      source: row.source != null ? String(row.source) : null,
      created_at: row.created_at != null ? String(row.created_at) : null
    }
  }
}];
`;

const AUTH_PANEL_JS = `const raw = $input.first().json || {};
const role = String(raw.jwtPayload?.role || "");
if (role !== "super_admin") throw new Error("Forbidden");
return [{ json: { ok: 1 } }];
`;

const FORMAT_PANEL_JS = `const rows = $input.all()
  .map(item => item.json)
  .filter(row => row && row.id != null)
  .map(row => ({
    id: Number(row.id),
    user_id: Number(row.user_id),
    phone: String(row.phone || ""),
    time_preference: row.time_preference === "specific" ? "specific" : "anytime",
    preferred_time: row.preferred_time != null ? String(row.preferred_time) : null,
    source: row.source != null ? String(row.source) : null,
    created_at: row.created_at != null ? String(row.created_at) : null,
    user_name: row.user_name != null ? String(row.user_name) : null,
    user_mobile: row.user_mobile != null ? String(row.user_mobile) : null
  }));
return [{ json: { success: true, result: rows } }];
`;

const INSERT_SQL = `INSERT INTO support__callback_requests
  (user_id, phone, time_preference, preferred_time, source)
VALUES ($1, $2, $3, $4, $5);`;

const SELECT_ONE_SQL = `SELECT id, user_id, phone, time_preference, preferred_time, source, created_at
FROM support__callback_requests
WHERE user_id = $1 AND phone = $2
ORDER BY id DESC
LIMIT 1;`;

const LIST_SQL = `SELECT c.id, c.user_id, c.phone, c.time_preference, c.preferred_time,
       c.source, c.created_at,
       u.name AS user_name, u.mobile AS user_mobile
FROM support__callback_requests c
LEFT JOIN users u ON u.id = c.user_id
ORDER BY c.created_at DESC
LIMIT 200;`;

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(
        path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env"),
        "utf8"
      )
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
  );
}

const env = readEnv();
const base = String(env.N8N_URL || "").replace(/\/$/, "");
const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!login.ok) throw new Error(`n8n login failed: ${login.status}`);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(item => item.name === WORKFLOW_NAME);
if (!summary) throw new Error("users workflow not found");
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const workflow = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `users-support-callbacks-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 2), "utf8");
console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

const nodes = structuredClone(workflow.nodes);
const connections = structuredClone(workflow.connections || {});

const sqlTemplate = nodes.find(node => node.name === "MySQL11");
const webhookTemplate = nodes.find(node => node.name === "add/address3");
const codeTemplate = nodes.find(node => node.name === "Code5");
const respondTemplate = nodes.find(node => node.name === "Respond to Webhook10");
if (!sqlTemplate || !webhookTemplate || !codeTemplate || !respondTemplate) {
  throw new Error("template nodes missing in users workflow");
}

for (const name of ADDED) {
  const index = nodes.findIndex(node => node.name === name);
  if (index >= 0) nodes.splice(index, 1);
  delete connections[name];
}
for (const outs of Object.values(connections)) {
  if (!outs?.main) continue;
  outs.main = outs.main.map(branch =>
    (branch || []).filter(link => !ADDED.includes(link.node))
  );
}

if (!revert) {
  const creds = sqlTemplate.credentials;
  const originX = 2400;
  const originY = 2200;

  const webhookNode = (name, method, pathName, row) => ({
    parameters: {
      httpMethod: method,
      path: pathName,
      authentication: "jwtAuth",
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: webhookTemplate.typeVersion,
    position: [originX, originY + row * 260],
    id: crypto.randomUUID(),
    name,
    webhookId: crypto.randomUUID()
  });

  const codeNode = (name, jsCode, col, row) => ({
    parameters: { mode: "runOnceForAllItems", jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: codeTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 260],
    id: crypto.randomUUID(),
    name
  });

  const sqlNode = (name, query, replacement, col, row) => ({
    parameters: {
      operation: "executeQuery",
      query,
      options: replacement ? { queryReplacement: replacement } : {}
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: sqlTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 260],
    id: crypto.randomUUID(),
    name,
    credentials: creds
  });

  const respondNode = (name, col, row) => ({
    parameters: {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json) }}",
      options: {}
    },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: respondTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 260],
    id: crypto.randomUUID(),
    name
  });

  nodes.push(
    webhookNode(CREATE_WH, "POST", "support/callbacks/create", 0),
    codeNode("support_cb_auth", AUTH_CREATE_JS, 1, 0),
    sqlNode(
      "support_cb_insert",
      INSERT_SQL,
      "={{ $json.user_id }},{{ $json.phone }},{{ $json.time_preference }},{{ $json.preferred_time }},{{ $json.source }}",
      2,
      0
    ),
    sqlNode(
      "support_cb_select",
      SELECT_ONE_SQL,
      "={{ $('support_cb_auth').item.json.user_id }},{{ $('support_cb_auth').item.json.phone }}",
      3,
      0
    ),
    codeNode("support_cb_format", FORMAT_CREATE_JS, 4, 0),
    respondNode("support_cb_respond", 5, 0),

    webhookNode(LIST_WH, "GET", "panel/support/callbacks", 1),
    codeNode("support_cb_panel_auth", AUTH_PANEL_JS, 1, 1),
    sqlNode("support_cb_panel_select", LIST_SQL, "", 2, 1),
    codeNode("support_cb_panel_format", FORMAT_PANEL_JS, 3, 1),
    respondNode("support_cb_panel_respond", 4, 1)
  );

  const link = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };
  link(CREATE_WH, "support_cb_auth");
  link("support_cb_auth", "support_cb_insert");
  link("support_cb_insert", "support_cb_select");
  link("support_cb_select", "support_cb_format");
  link("support_cb_format", "support_cb_respond");

  link(LIST_WH, "support_cb_panel_auth");
  link("support_cb_panel_auth", "support_cb_panel_select");
  link("support_cb_panel_select", "support_cb_panel_format");
  link("support_cb_panel_format", "support_cb_panel_respond");
}

const patch = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: workflow.name,
    nodes,
    connections,
    settings: workflow.settings
  })
});
if (!patch.ok) {
  throw new Error(`patch failed: ${patch.status} ${await patch.text()}`);
}
console.log(revert ? "support callbacks nodes removed" : "support callbacks nodes applied");
