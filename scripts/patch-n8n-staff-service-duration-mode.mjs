/**
 * Adds `duration_mode` mapping to centers__services insert used by /add/service
 * and ensures staffServices SELECT exposes duration_mode when columns are listed.
 *
 *   node scripts/patch-n8n-staff-service-duration-mode.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAMES = ["sayban", "sayban2", "panel", "panel2"];
const TARGET_TABLE = "centers__services";
const COLUMN = {
  column: "duration_mode",
  value:
    "={{ $json.body.service[0].duration_mode || $json.body.duration_mode || null }}"
};

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

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });

function tableName(node) {
  const table = node.parameters?.table;
  if (!table) return "";
  return typeof table === "string" ? table : table.value || "";
}

for (const name of WORKFLOW_NAMES) {
  const summary = (list.data || []).find(w => w.name === name);
  if (!summary) {
    console.warn(`! workflow ${name} not found; skipping`);
    continue;
  }

  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const wf = detail.data || detail;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `${name}-duration-mode-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
  console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

  const nodes = JSON.parse(JSON.stringify(wf.nodes));
  let changed = 0;

  for (const node of nodes) {
    if (tableName(node) !== TARGET_TABLE) continue;
    const values = node.parameters?.valuesToSend?.values;
    if (!Array.isArray(values)) continue;
    // Prefer insert nodes that already map category (staff catalog create).
    if (!values.some(v => v.column === "category")) continue;

    const idx = values.findIndex(v => v.column === "duration_mode");
    if (revert) {
      if (idx === -1) continue;
      values.splice(idx, 1);
      changed += 1;
      console.log(`${name}/${node.name}: removed duration_mode`);
      continue;
    }
    if (idx !== -1) {
      console.log(`${name}/${node.name}: duration_mode already present`);
      continue;
    }
    const categoryIdx = values.findIndex(v => v.column === "category");
    values.splice(categoryIdx + 1, 0, { ...COLUMN });
    changed += 1;
    console.log(`${name}/${node.name}: added duration_mode`);
  }

  // staffServices / panel Services SELECT: append column when query lists fields.
  for (const node of nodes) {
    const query = String(node.parameters?.query || node.parameters?.sql || "");
    if (!/centers__services/i.test(query)) continue;
    if (!/SELECT/i.test(query)) continue;
    if (/duration_mode/i.test(query)) continue;
    if (revert) continue;
    // Only touch queries that already select category (staff catalog).
    if (!/\bcategory\b/i.test(query)) continue;
    if (/\bSELECT\s+\*/i.test(query)) {
      console.log(`${name}/${node.name}: SELECT * — duration_mode auto-included`);
      continue;
    }
    const next = query.replace(
      /\bcategory\b/i,
      "category, duration_mode"
    );
    if (next === query) continue;
    if (node.parameters.query != null) node.parameters.query = next;
    if (node.parameters.sql != null) node.parameters.sql = next;
    changed += 1;
    console.log(`${name}/${node.name}: SELECT adds duration_mode`);
  }

  if (!changed) {
    console.log(`${name}: nothing to do`);
    continue;
  }

  const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: wf.name,
      nodes,
      connections: wf.connections,
      settings: wf.settings || {}
    })
  });
  if (!patchRes.ok) {
    throw new Error(
      `${name}: patch failed: ${patchRes.status} ${await patchRes.text()}`
    );
  }
  console.log(`${name}: patched OK`);
}
