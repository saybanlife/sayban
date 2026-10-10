/**
 * Adds `address/current` webhooks to the n8n `users` workflow:
 *   GET  address/current            -> the user's currently selected address
 *   POST address/current { address_id } -> marks that address as current
 *
 * Both require jwtAuth like the existing `/address` webhook, and reuse its
 * MySQL credentials. Depends on `users__addresses.is_current`
 * (see scripts/sql/users_addresses_is_current.sql).
 *
 *   node scripts/add-n8n-address-current-webhooks.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "users";
/** Existing nodes cloned for credentials / typeVersion. */
const TEMPLATE_SQL_NODE = "MySQL11";
const TEMPLATE_WEBHOOK_NODE = "add/address3";
const TEMPLATE_CODE_NODE = "Code5";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook10";

const GET_WEBHOOK = "address/current get";
const SET_WEBHOOK = "address/current set";

const SELECT_CURRENT = `SELECT id, user_id, title, address, details, city, postal_code,
       latitude, longitude, is_current, created_at
FROM users__addresses
WHERE user_id = $1
ORDER BY is_current DESC, id DESC
LIMIT 1;`;

const FORMAT_ONE = `const rows = items
  .map(item => item.json)
  .filter(row => row && Object.keys(row).length > 0);

return [{ json: { success: true, result: rows[0] || null } }];
`;

const ADDED_NODES = [
  GET_WEBHOOK,
  "address_current_select",
  "address_current_get_format",
  "address_current_get_respond",
  SET_WEBHOOK,
  "address_current_clear",
  "address_current_mark",
  "address_current_reselect",
  "address_current_set_format",
  "address_current_set_respond"
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

  const originX = (webhookTemplate.position?.[0] ?? 0) - 200;
  const originY = (webhookTemplate.position?.[1] ?? 0) + 320;

  const webhookNode = (name, httpMethod, row) => ({
    parameters: {
      httpMethod,
      path: "address/current",
      authentication: "jwtAuth",
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: webhookTemplate.typeVersion,
    position: [originX, originY + row * 200],
    id: crypto.randomUUID(),
    name,
    webhookId: crypto.randomUUID(),
    credentials: webhookTemplate.credentials
      ? JSON.parse(JSON.stringify(webhookTemplate.credentials))
      : undefined
  });

  const sqlNode = (name, query, queryReplacement, col, row) => ({
    parameters: {
      operation: "executeQuery",
      query,
      options: { queryReplacement }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: sqlTemplate.typeVersion,
    position: [originX + col * 220, originY + row * 200],
    id: crypto.randomUUID(),
    name,
    credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
  });

  const codeNode = (name, col, row) => ({
    parameters: { jsCode: FORMAT_ONE },
    type: "n8n-nodes-base.code",
    typeVersion: codeTemplate.typeVersion,
    position: [originX + col * 220, originY + row * 200],
    id: crypto.randomUUID(),
    name
  });

  const respondNode = (name, col, row) => ({
    parameters: { options: {} },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: respondTemplate.typeVersion,
    position: [originX + col * 220, originY + row * 200],
    id: crypto.randomUUID(),
    name
  });

  const jwtId = node => `{{ $('${node}').item.json.jwtPayload.id.toString() }}`;

  nodes.push(
    webhookNode(GET_WEBHOOK, "GET", 0),
    sqlNode(
      "address_current_select",
      SELECT_CURRENT,
      `=${jwtId(GET_WEBHOOK)}`,
      1,
      0
    ),
    codeNode("address_current_get_format", 2, 0),
    respondNode("address_current_get_respond", 3, 0),

    webhookNode(SET_WEBHOOK, "POST", 1),
    sqlNode(
      "address_current_clear",
      "UPDATE users__addresses SET is_current = 0 WHERE user_id = $1;",
      `=${jwtId(SET_WEBHOOK)}`,
      1,
      1
    ),
    sqlNode(
      "address_current_mark",
      "UPDATE users__addresses SET is_current = 1 WHERE id = $1 AND user_id = $2;",
      `={{ $('${SET_WEBHOOK}').item.json.body.address_id }},${jwtId(
        SET_WEBHOOK
      )}`,
      2,
      1
    ),
    sqlNode(
      "address_current_reselect",
      SELECT_CURRENT,
      `=${jwtId(SET_WEBHOOK)}`,
      3,
      1
    ),
    codeNode("address_current_set_format", 4, 1),
    respondNode("address_current_set_respond", 5, 1)
  );

  const wire = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };
  wire(GET_WEBHOOK, "address_current_select");
  wire("address_current_select", "address_current_get_format");
  wire("address_current_get_format", "address_current_get_respond");

  wire(SET_WEBHOOK, "address_current_clear");
  wire("address_current_clear", "address_current_mark");
  wire("address_current_mark", "address_current_reselect");
  wire("address_current_reselect", "address_current_set_format");
  wire("address_current_set_format", "address_current_set_respond");
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

console.log(revert ? "reverted" : "added GET + POST address/current");
