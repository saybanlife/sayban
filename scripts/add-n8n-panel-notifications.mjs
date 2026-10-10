/**
 * Adds panel inbox webhooks to n8n `panel2`:
 *   GET  panel/notifications
 *   POST panel/notifications/seen
 *   POST panel/notifications/add
 *
 *   node scripts/add-n8n-panel-notifications.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel2";
const TEMPLATE_JWT_WEBHOOK = "get/review/";
const TEMPLATE_SQL_NODE = "MySQL16";
const TEMPLATE_CODE_NODE = "Code13";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook57";

const ADDED = [
  "panel notifications",
  "panel_notif_list_auth",
  "panel_notif_list_sql",
  "panel_notif_list_wrap",
  "panel_notif_list_respond",
  "panel notifications seen",
  "panel_notif_seen_auth",
  "panel_notif_seen_sql",
  "panel_notif_seen_wrap",
  "panel_notif_seen_respond",
  "panel notifications add",
  "panel_notif_add_auth",
  "panel_notif_add_gate",
  "panel_notif_add_sql",
  "panel_notif_add_wrap",
  "panel_notif_add_respond"
];

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

function uuid() {
  return crypto.randomUUID();
}

const LIST_AUTH = `const input = items[0].json || {};
const auth = String(input.headers?.authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) { claims = {}; }
const panel_user_id = Number(claims.id) || 0;
return [{ json: { panel_user_id, ok: panel_user_id > 0 } }];
`;

const LIST_WRAP = `const auth = $('panel_notif_list_auth').first().json || {};
if (!auth.ok) {
  return [{ json: { success: false, message: "Unauthorized" } }];
}
const rows = items.map(i => i.json).filter(r => r && r.id != null);
return [{ json: { success: true, result: rows } }];
`;

const SEEN_AUTH = `const input = items[0].json || {};
const auth = String(input.headers?.authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) { claims = {}; }
const body = input.body || {};
const id = Number(body.id) || 0;
const panel_user_id = Number(claims.id) || 0;
return [{ json: { id, panel_user_id, ok: Boolean(id && panel_user_id) } }];
`;

const SEEN_WRAP = `const auth = $('panel_notif_seen_auth').first().json || {};
if (!auth.ok) {
  return [{ json: { success: false, message: "شناسه یا احراز هویت نامعتبر است." } }];
}
return [{ json: { success: true, result: { id: auth.id, is_seen: 1 } } }];
`;

const ADD_AUTH = `const input = items[0].json || {};
const auth = String(input.headers?.authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) { claims = {}; }
const body = input.body || {};
const title = String(body.title || "").trim();
const text = String(body.text || "").trim();
const action = String(body.action || "").trim() || null;
const notification_type = String(body.notification_type || "system").trim() || "system";
const allowed = new Set(["system","order_approved","order_rejected","reminder","promotion","other"]);
const type = allowed.has(notification_type) ? notification_type : "system";
let panel_user_id = 0;
if (body.panel_user_id != null && String(body.panel_user_id).trim() !== "") {
  panel_user_id = Number(body.panel_user_id) || 0;
}
const role = String(claims.role || "");
const admin_id = Number(claims.id) || 0;
return [{
  json: {
    admin_id,
    role,
    title,
    text,
    action,
    notification_type: type,
    panel_user_id,
    ok: Boolean(admin_id && role === "super_admin" && title && text)
  }
}];
`;

const ADD_WRAP = `const auth = $('panel_notif_add_auth').first().json || {};
if (!auth.ok) {
  return [{ json: { success: false, message: "فقط Super Admin می‌تواند اعلان پنل ذخیره کند." } }];
}
const first = $input.first().json || {};
const id = first.data?.insertId ?? first.insertId ?? null;
return [{
  json: {
    success: true,
    result: {
      id,
      panel_user_id: auth.panel_user_id,
      title: auth.title,
      notification_type: auth.notification_type
    }
  }
}];
`;

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const revert = process.argv.includes("--revert");

const loginRes = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!loginRes.ok) throw new Error(`n8n login failed: ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === WORKFLOW_NAME);
if (!summary) throw new Error(`workflow ${WORKFLOW_NAME} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `${WORKFLOW_NAME}-panel-notifications-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  nodes = nodes.filter(n => !ADDED.includes(n.name));
  for (const name of ADDED) delete connections[name];
} else {
  if (nodes.some(n => ADDED.includes(n.name))) {
    console.log("panel notification nodes already present; nothing to do");
    process.exit(0);
  }

  const webhookTemplate = nodes.find(n => n.name === TEMPLATE_JWT_WEBHOOK);
  const sqlTemplate = nodes.find(n => n.name === TEMPLATE_SQL_NODE);
  const codeTemplate = nodes.find(n => n.name === TEMPLATE_CODE_NODE);
  const respondTemplate = nodes.find(n => n.name === TEMPLATE_RESPOND_NODE);
  for (const [label, node] of [
    [TEMPLATE_JWT_WEBHOOK, webhookTemplate],
    [TEMPLATE_SQL_NODE, sqlTemplate],
    [TEMPLATE_CODE_NODE, codeTemplate],
    [TEMPLATE_RESPOND_NODE, respondTemplate]
  ]) {
    if (!node) throw new Error(`template node ${label} not found`);
  }

  const maxX = Math.max(...nodes.map(n => (n.position && n.position[0]) || 0));
  let x = maxX + 280;
  let y = 40;
  const step = 240;
  const mysqlCreds = JSON.parse(JSON.stringify(sqlTemplate.credentials || {}));
  const webhookCreds = JSON.parse(
    JSON.stringify(webhookTemplate.credentials || {})
  );

  const wire = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };

  // GET panel/notifications
  {
    const wh = "panel notifications";
    nodes.push(
      {
        parameters: {
          httpMethod: "GET",
          path: "panel/notifications",
          authentication: "jwtAuth",
          responseMode: "responseNode",
          options: {}
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: webhookTemplate.typeVersion,
        position: [x, y],
        id: uuid(),
        name: wh,
        webhookId: uuid(),
        credentials: webhookCreds
      },
      {
        parameters: { jsCode: LIST_AUTH },
        type: "n8n-nodes-base.code",
        typeVersion: codeTemplate.typeVersion,
        position: [x + 220, y],
        id: uuid(),
        name: "panel_notif_list_auth"
      },
      {
        parameters: {
          operation: "executeQuery",
          query: `SELECT id, panel_user_id, image, title, text, action, text_action,
       notification_type, created_at, is_seen
FROM panel__notification
WHERE panel_user_id = $1 OR panel_user_id = 0
ORDER BY created_at DESC
LIMIT 50;`,
          options: {
            queryReplacement:
              "={{ $('panel_notif_list_auth').item.json.panel_user_id.toString() }}"
          }
        },
        type: "n8n-nodes-base.mySql",
        typeVersion: sqlTemplate.typeVersion,
        position: [x + 440, y],
        id: uuid(),
        name: "panel_notif_list_sql",
        credentials: mysqlCreds,
        alwaysOutputData: true
      },
      {
        parameters: { jsCode: LIST_WRAP },
        type: "n8n-nodes-base.code",
        typeVersion: codeTemplate.typeVersion,
        position: [x + 660, y],
        id: uuid(),
        name: "panel_notif_list_wrap"
      },
      {
        parameters: { options: {} },
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: respondTemplate.typeVersion,
        position: [x + 880, y],
        id: uuid(),
        name: "panel_notif_list_respond"
      }
    );
    wire(wh, "panel_notif_list_auth");
    // Gate empty: still run SQL only if ok — if !ok, SQL with id 0 returns broadcasts only; wrap checks ok
    wire("panel_notif_list_auth", "panel_notif_list_sql");
    wire("panel_notif_list_sql", "panel_notif_list_wrap");
    wire("panel_notif_list_wrap", "panel_notif_list_respond");
    y += step;
  }

  // POST panel/notifications/seen
  {
    const wh = "panel notifications seen";
    nodes.push(
      {
        parameters: {
          httpMethod: "POST",
          path: "panel/notifications/seen",
          authentication: "jwtAuth",
          responseMode: "responseNode",
          options: {}
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: webhookTemplate.typeVersion,
        position: [x, y],
        id: uuid(),
        name: wh,
        webhookId: uuid(),
        credentials: webhookCreds
      },
      {
        parameters: { jsCode: SEEN_AUTH },
        type: "n8n-nodes-base.code",
        typeVersion: codeTemplate.typeVersion,
        position: [x + 220, y],
        id: uuid(),
        name: "panel_notif_seen_auth"
      },
      {
        parameters: {
          operation: "executeQuery",
          query: `UPDATE panel__notification
SET is_seen = 1
WHERE id = $1
  AND (panel_user_id = $2 OR panel_user_id = 0);`,
          options: {
            queryReplacement:
              "={{ [$json.id.toString(), $json.panel_user_id.toString()] }}"
          }
        },
        type: "n8n-nodes-base.mySql",
        typeVersion: sqlTemplate.typeVersion,
        position: [x + 440, y],
        id: uuid(),
        name: "panel_notif_seen_sql",
        credentials: mysqlCreds,
        alwaysOutputData: true
      },
      {
        parameters: { jsCode: SEEN_WRAP },
        type: "n8n-nodes-base.code",
        typeVersion: codeTemplate.typeVersion,
        position: [x + 660, y],
        id: uuid(),
        name: "panel_notif_seen_wrap"
      },
      {
        parameters: { options: {} },
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: respondTemplate.typeVersion,
        position: [x + 880, y],
        id: uuid(),
        name: "panel_notif_seen_respond"
      }
    );
    wire(wh, "panel_notif_seen_auth");
    wire("panel_notif_seen_auth", "panel_notif_seen_sql");
    wire("panel_notif_seen_sql", "panel_notif_seen_wrap");
    wire("panel_notif_seen_wrap", "panel_notif_seen_respond");
    y += step;
  }

  // POST panel/notifications/add
  {
    const wh = "panel notifications add";
    nodes.push(
      {
        parameters: {
          httpMethod: "POST",
          path: "panel/notifications/add",
          authentication: "jwtAuth",
          responseMode: "responseNode",
          options: {}
        },
        type: "n8n-nodes-base.webhook",
        typeVersion: webhookTemplate.typeVersion,
        position: [x, y],
        id: uuid(),
        name: wh,
        webhookId: uuid(),
        credentials: webhookCreds
      },
      {
        parameters: { jsCode: ADD_AUTH },
        type: "n8n-nodes-base.code",
        typeVersion: codeTemplate.typeVersion,
        position: [x + 220, y],
        id: uuid(),
        name: "panel_notif_add_auth"
      },
      {
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              typeValidation: "strict",
              version: 2
            },
            conditions: [
              {
                id: uuid(),
                leftValue: "={{ $json.ok }}",
                rightValue: true,
                operator: {
                  type: "boolean",
                  operation: "true",
                  singleValue: true
                }
              }
            ],
            combinator: "and"
          },
          options: {}
        },
        type: "n8n-nodes-base.if",
        typeVersion: 2.2,
        position: [x + 360, y + 100],
        id: uuid(),
        name: "panel_notif_add_gate"
      },
      {
        parameters: {
          operation: "executeQuery",
          query: `INSERT INTO panel__notification
  (panel_user_id, title, text, action, notification_type, is_seen)
VALUES ($1, $2, $3, NULLIF($4, ''), $5, 0);`,
          options: {
            queryReplacement:
              "={{ [$json.panel_user_id.toString(), $json.title, $json.text, $json.action || '', $json.notification_type] }}",
            detailedOutput: true
          }
        },
        type: "n8n-nodes-base.mySql",
        typeVersion: sqlTemplate.typeVersion,
        position: [x + 560, y],
        id: uuid(),
        name: "panel_notif_add_sql",
        credentials: mysqlCreds,
        onError: "continueRegularOutput"
      },
      {
        parameters: { jsCode: ADD_WRAP },
        type: "n8n-nodes-base.code",
        typeVersion: codeTemplate.typeVersion,
        position: [x + 780, y],
        id: uuid(),
        name: "panel_notif_add_wrap"
      },
      {
        parameters: { options: {} },
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: respondTemplate.typeVersion,
        position: [x + 1000, y],
        id: uuid(),
        name: "panel_notif_add_respond"
      }
    );
    wire(wh, "panel_notif_add_auth");
    connections["panel_notif_add_auth"] = {
      main: [[{ node: "panel_notif_add_gate", type: "main", index: 0 }]]
    };
    connections["panel_notif_add_gate"] = {
      main: [
        [{ node: "panel_notif_add_sql", type: "main", index: 0 }],
        [{ node: "panel_notif_add_wrap", type: "main", index: 0 }]
      ]
    };
    wire("panel_notif_add_sql", "panel_notif_add_wrap");
    wire("panel_notif_add_wrap", "panel_notif_add_respond");
  }
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}
console.log(
  revert
    ? "reverted panel notification webhooks"
    : "added GET/POST panel/notifications (+seen, +add)"
);
