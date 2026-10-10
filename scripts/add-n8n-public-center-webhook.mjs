/**
 * Adds an unauthenticated `api/center` webhook to the `sayban2` workflow,
 * wired into the existing enriched CenterInfo chain that `/center` already uses.
 *
 * The existing `/center` webhook stays untouched (jwtAuth) so panel/app callers
 * keep working. Rollback: re-import the backup written to scripts/backup/.
 *
 *   node scripts/add-n8n-public-center-webhook.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "sayban2";
const SOURCE_WEBHOOK = "center2";
const NEW_NODE_NAME = "api/center public";
const NEW_PATH = "api/center";

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

const nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  const idx = nodes.findIndex(n => n.name === NEW_NODE_NAME);
  if (idx === -1) {
    console.log("nothing to revert");
    process.exit(0);
  }
  nodes.splice(idx, 1);
  delete connections[NEW_NODE_NAME];
} else {
  if (nodes.some(n => n.name === NEW_NODE_NAME)) {
    console.log("node already present; nothing to do");
    process.exit(0);
  }
  const source = nodes.find(n => n.name === SOURCE_WEBHOOK);
  if (!source) throw new Error(`source webhook ${SOURCE_WEBHOOK} not found`);

  nodes.push({
    parameters: {
      path: NEW_PATH,
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: source.typeVersion,
    position: [
      (source.position?.[0] ?? 0) - 220,
      (source.position?.[1] ?? 0) + 180
    ],
    id: crypto.randomUUID(),
    name: NEW_NODE_NAME,
    webhookId: crypto.randomUUID()
  });

  connections[NEW_NODE_NAME] = JSON.parse(
    JSON.stringify(connections[SOURCE_WEBHOOK])
  );
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

console.log(revert ? "reverted" : `added ${NEW_NODE_NAME} -> ${NEW_PATH}`);
