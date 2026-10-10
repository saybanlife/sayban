/**
 * Adds `panel/center/account-status` to the n8n `panel2` workflow:
 *   POST { center_id, is_active } -> enables/disables the center's panel login
 *
 * Updates `panel__users.is_active` for the center's `center_admin` row, so the
 * centers table can toggle an account without knowing its user id.
 * Auth matches the sibling panel webhooks (`/panel/users/is_active`), which are
 * currently unauthenticated.
 *
 *   node scripts/add-n8n-center-account-status-webhook.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel2";
const TEMPLATE_SQL_NODE = "MySQL70";
const TEMPLATE_WEBHOOK_NODE = "/panel/users/edit2";
const TEMPLATE_CODE_NODE = "Code38";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook57";

const WEBHOOK_NODE = "center account status";
const UPDATE_NODE = "center_account_status_update";
const READ_NODE = "center_account_status_read";
const FORMAT_NODE = "center_account_status_format";
const RESPOND_NODE = "center_account_status_respond";

const ADDED_NODES = [
  WEBHOOK_NODE,
  UPDATE_NODE,
  READ_NODE,
  FORMAT_NODE,
  RESPOND_NODE
];

const UPDATE_SQL = `UPDATE panel__users
SET is_active = $1
WHERE center_id = $2 AND role = 'center_admin';`;

const READ_SQL = `SELECT id, center_id, is_active
FROM panel__users
WHERE center_id = $1 AND role = 'center_admin'
ORDER BY id ASC
LIMIT 1;`;

const FORMAT_JS = `const rows = items
  .map(item => item.json)
  .filter(row => row && Object.keys(row).length > 0);

return [{ json: { success: true, result: rows[0] || null } }];
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
  `${WORKFLOW_NAME}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
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

  const sqlTemplate = nodes.find(n => n.name === TEMPLATE_SQL_NODE);
  const webhookTemplate = nodes.find(n => n.name === TEMPLATE_WEBHOOK_NODE);
  const codeTemplate = nodes.find(n => n.name === TEMPLATE_CODE_NODE);
  const respondTemplate = nodes.find(n => n.name === TEMPLATE_RESPOND_NODE);
  for (const [label, node] of [
    [TEMPLATE_SQL_NODE, sqlTemplate],
    [TEMPLATE_WEBHOOK_NODE, webhookTemplate],
    [TEMPLATE_CODE_NODE, codeTemplate],
    [TEMPLATE_RESPOND_NODE, respondTemplate]
  ]) {
    if (!node) throw new Error(`template node ${label} not found`);
  }

  const x = (webhookTemplate.position?.[0] ?? 0) - 200;
  const y = (webhookTemplate.position?.[1] ?? 0) + 220;

  nodes.push(
    {
      parameters: {
        httpMethod: "POST",
        path: "panel/center/account-status",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: webhookTemplate.typeVersion,
      position: [x, y],
      id: crypto.randomUUID(),
      name: WEBHOOK_NODE,
      webhookId: crypto.randomUUID()
    },
    {
      parameters: {
        operation: "executeQuery",
        query: UPDATE_SQL,
        options: {
          queryReplacement:
            "={{ $json.body.is_active }},{{ $json.body.center_id }}"
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 220, y],
      id: crypto.randomUUID(),
      name: UPDATE_NODE,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: {
        operation: "executeQuery",
        query: READ_SQL,
        options: {
          // n8n requires the replacement to be a string, hence toString().
          queryReplacement: `={{ $('${WEBHOOK_NODE}').item.json.body.center_id.toString() }}`
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 440, y],
      id: crypto.randomUUID(),
      name: READ_NODE,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: { jsCode: FORMAT_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [x + 660, y],
      id: crypto.randomUUID(),
      name: FORMAT_NODE
    },
    {
      parameters: { options: {} },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: respondTemplate.typeVersion,
      position: [x + 880, y],
      id: crypto.randomUUID(),
      name: RESPOND_NODE
    }
  );

  const wire = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };
  wire(WEBHOOK_NODE, UPDATE_NODE);
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

console.log(revert ? "reverted" : "added POST panel/center/account-status");
