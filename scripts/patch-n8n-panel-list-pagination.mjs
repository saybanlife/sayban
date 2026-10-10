/**
 * Add server pagination (page/limit/search) to panel list endpoints:
 *   GET /panel/centers  (panel2 → MySQL1 → Code1)
 *   GET /panel/users    (panel2 → MySQL26 → Code23)
 *
 * Response shape matches /panel/Reservation:
 *   { success, result, pagination: { page, limit, count, total, totalPages, ... } }
 *
 *   node scripts/patch-n8n-panel-list-pagination.mjs
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "panel2";

const CENTERS_QUERY = `SELECT c.id, c.main_image, c.name as "نام", c.address as "آدرس", c.city as "شهر", c.state as "استان", c.phone as "تلفن", c.working_hours as "ساعات کاری",
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

const CENTERS_REPLACEMENT = `={{ $json.query.subcategoriesId ?? "" }}, {{ $json.query.active === undefined || $json.query.active === null || $json.query.active === "" ? "" : Number($json.query.active) }}, {{ ($json.query.search && $json.query.search !== "no") ? $json.query.search : "" }}`;

const USERS_QUERY = `SELECT
  \`id\`             AS \`شناسه\`,
  \`name\`           AS \`نام\`,
  \`mobile\`         AS \`موبایل\`,
  \`national_code\`  AS \`کد ملی\`,
  \`city\`           AS \`شهر\`,
  \`gender\`         AS \`جنسیت\`,
  \`marital_status\` AS \`وضعیت تاهل\`,
  COUNT(*) OVER() AS total_count
FROM \`users\`
WHERE active = $1
AND (
  $2 = '' OR $2 = 'no'
  OR \`name\` LIKE CONCAT('%', $2, '%')
  OR \`mobile\` LIKE CONCAT('%', $2, '%')
  OR \`national_code\` LIKE CONCAT('%', $2, '%')
  OR \`city\` LIKE CONCAT('%', $2, '%')
)
ORDER BY \`id\` DESC
LIMIT {{ Math.min(Math.max(Number.parseInt($json.query.limit || '10', 10), 1), 100) }}
OFFSET {{ (Math.max(Number.parseInt($json.query.page || '1', 10), 1) - 1) * Math.min(Math.max(Number.parseInt($json.query.limit || '10', 10), 1), 100) }};`;

const USERS_REPLACEMENT = `={{ Number($json.query.active) || 1 }}, {{ ($json.query.search && $json.query.search !== "no") ? $json.query.search : "" }}`;

const CODE_PAGED = (webhookNodeName) => `const webhook = $('${webhookNodeName}').first().json || {};
const query = webhook.query || {};
const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
const limit = Math.min(Math.max(Number.parseInt(query.limit || '10', 10), 1), 100);

const output = [];
let total = 0;

for (const item of items) {
  const data = { ...item.json };
  if (typeof data.total_count !== 'undefined') {
    total = Number(data.total_count || 0);
    delete data.total_count;
  }
  if (typeof data.subcategories === 'string') {
    try {
      data.subcategories = JSON.parse(data.subcategories);
    } catch (e) {
      data.subcategories = [];
    }
  }
  output.push(data);
}

const totalPages = Math.max(1, Math.ceil(total / limit));

return [
  {
    json: {
      success: true,
      result: output,
      pagination: {
        page,
        limit,
        count: output.length,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    }
  }
];`;

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
  `${WORKFLOW_NAME}-list-pagination-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = JSON.parse(JSON.stringify(wf.nodes));

function patchSql(name, query, replacement) {
  const node = nodes.find(n => n.name === name);
  if (!node) throw new Error(`node ${name} not found`);
  node.parameters = node.parameters || {};
  node.parameters.query = query;
  node.parameters.options = node.parameters.options || {};
  node.parameters.options.queryReplacement = replacement;
  console.log(`patched SQL ${name}`);
}

function patchCode(name, jsCode) {
  const node = nodes.find(n => n.name === name);
  if (!node) throw new Error(`node ${name} not found`);
  node.parameters = node.parameters || {};
  node.parameters.jsCode = jsCode;
  console.log(`patched Code ${name}`);
}

patchSql("MySQL1", CENTERS_QUERY, CENTERS_REPLACEMENT);
patchCode("Code1", CODE_PAGED("centers"));
patchSql("MySQL26", USERS_QUERY, USERS_REPLACEMENT);
patchCode("Code23", CODE_PAGED("users"));

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

console.log("patched panel/centers and panel/users pagination");
