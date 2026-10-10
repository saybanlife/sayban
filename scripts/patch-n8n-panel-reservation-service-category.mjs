/**
 * Enrich panel-reservation services with `category` (general/specialized).
 *
 *   node scripts/patch-n8n-panel-reservation-service-category.mjs
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_ID = "Cbod5xr19Qx9hEMx";

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
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

const env = readEnv();
const base = env.N8N_URL.replace(/\/$/, "");
const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!login.ok) throw new Error(`login ${login.status}`);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

const detail = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `panel-reservation-service-category-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const nodes = JSON.parse(JSON.stringify(wf.nodes));

const MYSQL_QUERY = `SELECT id, name, category
FROM centers__services
WHERE id IN ({{ $json.unique_service_ids.join(',') || '0' }});`;

for (const name of ["MySQL58", "MySQL62"]) {
  const node = nodes.find(n => n.name === name);
  if (!node) throw new Error(`missing ${name}`);
  node.parameters.query = MYSQL_QUERY;
  console.log("patched", name);
}

function patchAssembler(name) {
  const node = nodes.find(n => n.name === name);
  if (!node) throw new Error(`missing ${name}`);
  let code = String(node.parameters.jsCode || "");

  const oldMap =
    name === "Code28"
      ? `serviceNames.forEach(s => {
    if (s.id) servicesMap[s.id] = s.name;
});`
      : `serviceNames.forEach(s => {
    if (s && s.id) servicesMap[s.id] = s.name;
});`;

  const newMap =
    name === "Code28"
      ? `serviceNames.forEach(s => {
    if (s.id) servicesMap[s.id] = { name: s.name, category: s.category || null };
});`
      : `serviceNames.forEach(s => {
    if (s && s.id) servicesMap[s.id] = { name: s.name, category: s.category || null };
});`;

  if (!code.includes(oldMap)) {
    throw new Error(`${name}: servicesMap assignment not found`);
  }
  code = code.replace(oldMap, newMap);

  const oldPush = `servicesList.push({
                    id: id,
                    name: servicesMap[id]
                });`;
  const newPush = `servicesList.push({
                    id: id,
                    name: servicesMap[id].name,
                    category: servicesMap[id].category || null
                });`;
  if (!code.includes(oldPush)) {
    throw new Error(`${name}: servicesList.push not found`);
  }
  code = code.replace(oldPush, newPush);

  node.parameters.jsCode = code;
  console.log("patched", name);
}

patchAssembler("Code28");
patchAssembler("Code48");

const patch = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    staticData: wf.staticData,
    active: true
  })
});
if (!patch.ok) throw new Error(`patch ${patch.status} ${await patch.text()}`);

// Reactivate to refresh webhook handlers
await fetch(`${base}/rest/workflows/${WORKFLOW_ID}/deactivate`, {
  method: "POST",
  headers: { Cookie: cookie }
});
const act = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}/activate`, {
  method: "POST",
  headers: { Cookie: cookie }
});
console.log("activate", act.status);
console.log("done");
