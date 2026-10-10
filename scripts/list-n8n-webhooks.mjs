/**
 * List n8n webhook paths, optionally filtered: node scripts/list-n8n-webhooks.mjs center
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
const filter = (process.argv[2] || "").toLowerCase();

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
if (!listRes.ok) {
  console.error(`workflows list failed: ${listRes.status}`);
  process.exit(1);
}
const { data = [] } = await listRes.json();

const rows = [];
for (const wf of data) {
  const detail = await fetch(`${base}/rest/workflows/${wf.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => (r.ok ? r.json() : null));
  const nodes = detail?.data?.nodes || detail?.nodes || [];
  for (const node of nodes) {
    if (!String(node.type || "").includes("webhook")) continue;
    const p = node.parameters?.path;
    if (!p) continue;
    if (filter && !String(p).toLowerCase().includes(filter)) continue;
    rows.push({
      workflow: wf.name,
      active: wf.active,
      method: node.parameters?.httpMethod || "GET",
      path: p
    });
  }
}

console.log(JSON.stringify(rows, null, 1));
