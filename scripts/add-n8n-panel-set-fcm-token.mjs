/**
 * Adds `POST panel/setFcmToken` to the n8n `panel2` workflow.
 *
 * Body: { token, platform?, client? }
 * Auth: Bearer panel JWT (jwtAuth) — updates panel__users.fcmToken for claims.id
 * and sets isnotif = 1.
 *
 *   node scripts/add-n8n-panel-set-fcm-token.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel2";
const TEMPLATE_JWT_WEBHOOK = "get/review/";
const TEMPLATE_SQL_NODE = "MySQL16";
const TEMPLATE_CODE_NODE = "Code13";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook57";

const WEBHOOK_NODE = "panel setFcmToken";
const AUTH_NODE = "panel_set_fcm_auth";
const GATE_NODE = "panel_set_fcm_ok_gate";
const UPDATE_NODE = "panel_set_fcm_update";
const READ_NODE = "panel_set_fcm_read";
const FORMAT_NODE = "panel_set_fcm_format";
const RESPOND_NODE = "panel_set_fcm_respond";

const ADDED_NODES = [
  WEBHOOK_NODE,
  AUTH_NODE,
  GATE_NODE,
  UPDATE_NODE,
  READ_NODE,
  FORMAT_NODE,
  RESPOND_NODE
];

const AUTH_JS = `const input = items[0].json || {};
const auth = String(input.headers?.authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();

let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) {
  claims = {};
}

const body = input.body || {};
const fcmToken = String(body.token || body.fcmToken || "").trim();
const platform = String(body.platform || "web").trim() || "web";

return [{
  json: {
    panel_user_id: Number(claims.id) || 0,
    role: String(claims.role || ""),
    fcmToken,
    platform,
    ok: Boolean(Number(claims.id) && fcmToken)
  }
}];
`;

const UPDATE_SQL = `UPDATE panel__users
SET fcmToken = $1,
    isnotif = 1
WHERE id = $2
  AND is_active = 1;`;

const READ_SQL = `SELECT id, role, center_id, fcmToken, isnotif
FROM panel__users
WHERE id = $1
LIMIT 1;`;

const FORMAT_JS = `const auth = $('${AUTH_NODE}').first().json || {};
if (!auth.ok) {
  return [{
    json: {
      success: false,
      message: "توکن احراز هویت یا FCM نامعتبر است."
    }
  }];
}
const row = items.map(i => i.json).find(r => r && r.id != null) || null;
if (!row) {
  return [{
    json: {
      success: false,
      message: "کاربر پنل یافت نشد."
    }
  }];
}
return [{
  json: {
    success: true,
    result: {
      id: Number(row.id),
      role: row.role,
      center_id: row.center_id != null ? Number(row.center_id) : null,
      fcmToken: row.fcmToken ? String(row.fcmToken) : null,
      isnotif: Number(row.isnotif) === 1 ? 1 : 0,
      platform: auth.platform || "web"
    }
  }
}];
`;

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
  `${WORKFLOW_NAME}-panel-fcm-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  nodes = nodes.filter(n => !ADDED_NODES.includes(n.name));
  for (const name of ADDED_NODES) delete connections[name];
} else {
  if (nodes.some(n => ADDED_NODES.includes(n.name))) {
    console.log("nodes already present; nothing to do");
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

  const x = (webhookTemplate.position?.[0] ?? 0) - 200;
  const y = (webhookTemplate.position?.[1] ?? 0) + 980;

  nodes.push(
    {
      parameters: {
        httpMethod: "POST",
        path: "panel/setFcmToken",
        authentication: "jwtAuth",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: webhookTemplate.typeVersion,
      position: [x, y],
      id: crypto.randomUUID(),
      name: WEBHOOK_NODE,
      webhookId: crypto.randomUUID(),
      credentials: JSON.parse(JSON.stringify(webhookTemplate.credentials || {}))
    },
    {
      parameters: { jsCode: AUTH_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [x + 220, y],
      id: crypto.randomUUID(),
      name: AUTH_NODE
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
              id: crypto.randomUUID(),
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
      position: [x + 360, y + 120],
      id: crypto.randomUUID(),
      name: GATE_NODE
    },
    {
      parameters: {
        operation: "executeQuery",
        query: UPDATE_SQL,
        options: {
          queryReplacement:
            "={{ [$json.fcmToken, $json.panel_user_id] }}"
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 560, y],
      id: crypto.randomUUID(),
      name: UPDATE_NODE,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: {
        operation: "executeQuery",
        query: READ_SQL,
        options: {
          queryReplacement: `={{ $('${AUTH_NODE}').item.json.panel_user_id.toString() }}`
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 780, y],
      id: crypto.randomUUID(),
      name: READ_NODE,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: { jsCode: FORMAT_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [x + 1000, y],
      id: crypto.randomUUID(),
      name: FORMAT_NODE
    },
    {
      parameters: { options: {} },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: respondTemplate.typeVersion,
      position: [x + 1220, y],
      id: crypto.randomUUID(),
      name: RESPOND_NODE
    }
  );

  const wire = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };
  wire(WEBHOOK_NODE, AUTH_NODE);
  connections[AUTH_NODE] = {
    main: [[{ node: GATE_NODE, type: "main", index: 0 }]]
  };
  connections[GATE_NODE] = {
    main: [
      [{ node: UPDATE_NODE, type: "main", index: 0 }],
      [{ node: FORMAT_NODE, type: "main", index: 0 }]
    ]
  };
  wire(UPDATE_NODE, READ_NODE);
  wire(READ_NODE, FORMAT_NODE);
  wire(FORMAT_NODE, RESPOND_NODE);
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

console.log(revert ? "reverted" : "added POST panel/setFcmToken");
