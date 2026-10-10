/**
 * Extends GET /panel/centers so each row includes `approval_status` for the
 * Super Admin list («وضعیت تأیید»).
 *
 *   node scripts/patch-n8n-panel-centers-approval-status.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "panel2";
const SQL_NODE = "MySQL1";

const WITHOUT_APPROVAL = `SELECT c.id, c.main_image, c.name as "نام", c.address as "آدرس", c.city as "شهر", c.state as "استان", c.phone as "تلفن", c.working_hours as "ساعات کاری",
       pu.id AS account_id,
       pu.is_active AS account_is_active,
       COUNT(*) OVER() AS total_count
FROM centers c
LEFT JOIN panel__users pu ON pu.id = (
  SELECT pu2.id FROM panel__users pu2
  WHERE pu2.center_id = c.id AND pu2.role = 'center_admin'
  ORDER BY pu2.id ASC LIMIT 1
)
WHERE c.deleted_at IS NULL
AND ($2 = '' OR c.is_active = $2)
AND ($1 = '' OR c.subcategory_id = $1)
AND (
  $3 = '' OR $3 = 'no'
  OR c.name LIKE CONCAT('%', $3, '%')
  OR c.address LIKE CONCAT('%', $3, '%')
  OR c.city LIKE CONCAT('%', $3, '%')
  OR c.phone LIKE CONCAT('%', $3, '%')
)
ORDER BY c.created_at DESC
LIMIT {{ Math.min(Math.max(Number.parseInt($json.query.limit || '10', 10), 1), 100) }}
OFFSET {{ (Math.max(Number.parseInt($json.query.page || '1', 10), 1) - 1) * Math.min(Math.max(Number.parseInt($json.query.limit || '10', 10), 1), 100) }};`;

const WITH_APPROVAL = `SELECT c.id, c.main_image, c.name as "نام", c.address as "آدرس", c.city as "شهر", c.state as "استان", c.phone as "تلفن", c.working_hours as "ساعات کاری",
       c.approval_status AS approval_status,
       pu.id AS account_id,
       pu.is_active AS account_is_active,
       COUNT(*) OVER() AS total_count
FROM centers c
LEFT JOIN panel__users pu ON pu.id = (
  SELECT pu2.id FROM panel__users pu2
  WHERE pu2.center_id = c.id AND pu2.role = 'center_admin'
  ORDER BY pu2.id ASC LIMIT 1
)
WHERE c.deleted_at IS NULL
AND ($2 = '' OR c.is_active = $2)
AND ($1 = '' OR c.subcategory_id = $1)
AND (
  $3 = '' OR $3 = 'no'
  OR c.name LIKE CONCAT('%', $3, '%')
  OR c.address LIKE CONCAT('%', $3, '%')
  OR c.city LIKE CONCAT('%', $3, '%')
  OR c.phone LIKE CONCAT('%', $3, '%')
)
ORDER BY c.created_at DESC
LIMIT {{ Math.min(Math.max(Number.parseInt($json.query.limit || '10', 10), 1), 100) }}
OFFSET {{ (Math.max(Number.parseInt($json.query.page || '1', 10), 1) - 1) * Math.min(Math.max(Number.parseInt($json.query.limit || '10', 10), 1), 100) }};`;

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
  `${WORKFLOW_NAME}-centers-approval-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = [...wf.nodes];
const sqlNode = nodes.find(n => n.name === SQL_NODE);
if (!sqlNode) throw new Error(`SQL node ${SQL_NODE} not found`);

const nextQuery = revert ? WITHOUT_APPROVAL : WITH_APPROVAL;
sqlNode.parameters = {
  ...sqlNode.parameters,
  query: nextQuery
};

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

const activateRes = await fetch(
  `${base}/rest/workflows/${summary.id}/activate`,
  {
    method: "POST",
    headers: { Cookie: cookie, Accept: "application/json" }
  }
);
console.log(
  activateRes.ok
    ? `centers list ${revert ? "reverted" : "patched"} + activated`
    : `patched but activate failed: ${activateRes.status}`
);
