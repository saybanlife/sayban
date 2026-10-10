/**
 * Dump an n8n workflow's nodes (types, params) for inspection:
 *   node scripts/dump-n8n-workflow.mjs <workflowName> [nodeNameFilter]
 * Reads credentials from .cursor/sayban-ops/secrets/n8n_sayban.env (never printed).
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(
  process.cwd(),
  ".cursor/sayban-ops/secrets/n8n_sayban.env"
);
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith("#"))
    .map(line => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const base = (env.N8N_URL || "").replace(/\/$/, "");
const wantWorkflow = (process.argv[2] || "").toLowerCase();
const nodeFilter = (process.argv[3] || "").toLowerCase();

const loginRes = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!loginRes.ok) {
  console.error(`n8n login failed: ${loginRes.status}`);
  process.exit(1);
}
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const listRes = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
});
const { data = [] } = await listRes.json();
const wf = data.find(w => String(w.name).toLowerCase() === wantWorkflow);
if (!wf) {
  console.error(
    `workflow not found. available: ${data.map(w => w.name).join(", ")}`
  );
  process.exit(1);
}

const detail = await fetch(`${base}/rest/workflows/${wf.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());

const nodes = detail?.data?.nodes || detail?.nodes || [];
const connections = detail?.data?.connections || detail?.connections || {};

const out = nodes
  .filter(n => !nodeFilter || String(n.name).toLowerCase().includes(nodeFilter))
  .map(n => ({
    name: n.name,
    type: String(n.type).replace("n8n-nodes-base.", ""),
    params: n.parameters,
    next: (connections[n.name]?.main || [])
      .flat()
      .map(c => c?.node)
      .filter(Boolean)
  }));

console.log(JSON.stringify({ workflow: wf.name, id: wf.id, nodes: out }, null, 1));
