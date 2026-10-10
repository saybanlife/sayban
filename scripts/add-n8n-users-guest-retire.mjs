/**
 * Adds POST users/guest/retire on the n8n `users` workflow.
 * Deletes the caller’s own guest row only when it has no mobile.
 *
 *   node scripts/add-n8n-users-guest-retire.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_ID = "YtnbHT0uSCKzfGJb";
const WEBHOOK_NODE = "users guest retire";
const CODE_NODE = "users_guest_retire_auth";
const SQL_NODE = "users_guest_retire_delete";
const RESPOND_NODE = "users_guest_retire_respond";
const ADDED = [WEBHOOK_NODE, CODE_NODE, SQL_NODE, RESPOND_NODE];

const AUTH_JS = `const input = items[0].json || {};
const auth = String(input.headers?.authorization || input.headers?.Authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) {
  claims = {};
}
const jwtId = Number(claims.id);
const bodyId = Number((input.body || {}).id);
if (!jwtId || !bodyId || jwtId !== bodyId) {
  throw new Error("guest id mismatch");
}
return [{ json: { id: String(jwtId) } }];
`;

const DELETE_SQL = `DELETE FROM users
WHERE id = $1
  AND (mobile IS NULL OR mobile = '')`;

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

const detail = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(
  process.cwd(),
  ".cursor/sayban-ops/backups"
);
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `users-guest-retire-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log("backup written");

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  nodes = nodes.filter(n => !ADDED.includes(n.name));
  for (const name of ADDED) delete connections[name];
} else if (!nodes.some(n => ADDED.includes(n.name))) {
  const webhookTemplate = nodes.find(n => n.name === "/users/guest");
  const sqlTemplate = nodes.find(n => n.name === "MySQL12");
  const respondTemplate = nodes.find(n => n.name === "Respond to Webhook4");
  if (!webhookTemplate || !sqlTemplate || !respondTemplate) {
    throw new Error("template nodes missing");
  }
  const x = (webhookTemplate.position?.[0] ?? 0) + 40;
  const y = (webhookTemplate.position?.[1] ?? 0) + 280;
  nodes.push(
    {
      parameters: {
        httpMethod: "POST",
        path: "users/guest/retire",
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
      parameters: { jsCode: AUTH_JS },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [x + 220, y],
      id: crypto.randomUUID(),
      name: CODE_NODE
    },
    {
      parameters: {
        operation: "executeQuery",
        query: DELETE_SQL,
        options: {
          queryReplacement: "={{ $json.id }}"
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 440, y],
      id: crypto.randomUUID(),
      name: SQL_NODE,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ { success: true } }}",
        options: {}
      },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: respondTemplate.typeVersion,
      position: [x + 660, y],
      id: crypto.randomUUID(),
      name: RESPOND_NODE
    }
  );
  const wire = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };
  wire(WEBHOOK_NODE, CODE_NODE);
  wire(CODE_NODE, SQL_NODE);
  wire(SQL_NODE, RESPOND_NODE);
} else {
  console.log("nodes already present");
}

const patchRes = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
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
console.log(revert ? "reverted users/guest/retire" : "added POST users/guest/retire");
