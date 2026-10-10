/**
 * Extends the `panel/centers` query in the n8n `panel2` workflow so each row
 * carries the center's panel account (`panel__users` where role =
 * 'center_admin'), enabling the active/inactive switch in `mainPageCenter`.
 *
 * Adds `account_id` + `account_is_active`; existing columns are unchanged.
 *
 *   node scripts/patch-n8n-panel-centers-account.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "panel2";
const SQL_NODE = "MySQL1";

const ORIGINAL_QUERY = `SELECT id, main_image, name as "نام", address as "آدرس", city as "شهر", state as "استان", phone as "تلفن", working_hours as "ساعات کاری"
FROM centers
WHERE deleted_at IS NULL
AND($2 = '' OR is_active = $2)
AND ($1 = '' OR subcategory_id = $1)
ORDER BY created_at DESC;`;

// One row per center: the account is picked by a scalar subquery rather than a
// plain join, so centers with several admins cannot duplicate rows.
const PATCHED_QUERY = `SELECT c.id, c.main_image, c.name as "نام", c.address as "آدرس", c.city as "شهر", c.state as "استان", c.phone as "تلفن", c.working_hours as "ساعات کاری",
       pu.id AS account_id,
       pu.is_active AS account_is_active
FROM centers c
LEFT JOIN panel__users pu ON pu.id = (
  SELECT pu2.id FROM panel__users pu2
  WHERE pu2.center_id = c.id AND pu2.role = 'center_admin'
  ORDER BY pu2.id ASC LIMIT 1
)
WHERE c.deleted_at IS NULL
AND($2 = '' OR c.is_active = $2)
AND ($1 = '' OR c.subcategory_id = $1)
ORDER BY c.created_at DESC;`;

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

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const node = nodes.find(n => n.name === SQL_NODE);
if (!node) throw new Error(`node ${SQL_NODE} not found`);

const current = String(node.parameters.query || "").trim();
const want = revert ? ORIGINAL_QUERY : PATCHED_QUERY;
const from = revert ? PATCHED_QUERY : ORIGINAL_QUERY;

if (current === want.trim()) {
  console.log("query already in the requested state; nothing to do");
  process.exit(0);
}
if (current !== from.trim()) {
  console.error(
    "aborting: query does not match the expected source text.\n--- live ---\n" +
      current
  );
  process.exit(1);
}

node.parameters.query = want;

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
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

console.log(revert ? "reverted panel/centers query" : "patched panel/centers query");
