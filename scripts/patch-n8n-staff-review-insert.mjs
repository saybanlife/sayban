/**
 * Adds `staff_id` to the `set/comment/` insert into `centers__reviews`.
 *
 * The insert only ever wrote `center_id`, so a review submitted from a nurse
 * (staff) page landed with both `center_id` and `staff_id` NULL and could never
 * be read back — the staff page reads `WHERE r.staff_id = <id>`.
 *
 * Additive and reversible: only a new column mapping is added, and `center_id`
 * is made explicitly null-safe so center reviews keep working unchanged.
 *
 *   node scripts/patch-n8n-staff-review-insert.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAMES = ["sayban", "sayban2"];
const TARGET_TABLE = "centers__reviews";

const STAFF_ID_COLUMN = {
  column: "staff_id",
  value: "={{ $json.body.staff_id || null }}"
};
const CENTER_ID_ORIGINAL = "={{ $json.body.center_id }}";
const CENTER_ID_PATCHED = "={{ $json.body.center_id || null }}";

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
  const backupFile = path.join(backupDir, `${name}-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
  console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

  const nodes = JSON.parse(JSON.stringify(wf.nodes));
  const targets = nodes.filter(node => {
    if (tableName(node) !== TARGET_TABLE) return false;
    const values = node.parameters?.valuesToSend?.values;
    return (
      Array.isArray(values) && values.some(v => v.column === "center_id")
    );
  });

  if (!targets.length) {
    console.log(`${name}: no ${TARGET_TABLE} insert node; skipping`);
    continue;
  }

  let changed = 0;
  for (const node of targets) {
    const values = node.parameters.valuesToSend.values;
    const centerId = values.find(v => v.column === "center_id");
    const staffIdx = values.findIndex(v => v.column === "staff_id");

    if (revert) {
      if (staffIdx === -1 && centerId.value === CENTER_ID_ORIGINAL) continue;
      if (staffIdx !== -1) values.splice(staffIdx, 1);
      centerId.value = CENTER_ID_ORIGINAL;
      changed += 1;
      console.log(`${name}/${node.name}: removed staff_id`);
      continue;
    }

    if (staffIdx !== -1 && centerId.value === CENTER_ID_PATCHED) {
      console.log(`${name}/${node.name}: already patched`);
      continue;
    }
    if (staffIdx === -1) {
      // Insert next to center_id so the mapping reads naturally in the UI.
      values.splice(values.indexOf(centerId) + 1, 0, { ...STAFF_ID_COLUMN });
    }
    centerId.value = CENTER_ID_PATCHED;
    changed += 1;
    console.log(`${name}/${node.name}: added staff_id`);
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
  console.log(`${name}: saved`);
}

console.log(revert ? "revert complete" : "patch complete");
