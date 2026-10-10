/**
 * Returns the companion's address from `GET /patients` (workflow "users",
 * node "MySQL10").
 *
 * The «افزودن همراه» form now collects an address using the same fields as
 * «افزودن آدرس» (see scripts/sql/users_patient_address.sql). Writes need no
 * workflow change — the insert node ("MySQL9") maps columns automatically — but
 * this SELECT lists its columns explicitly, so the new ones must be added here
 * or the address is write-only.
 *
 *   node scripts/patch-n8n-patients-address.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "users";
const NODE_NAME = "MySQL10";

const RELATION_CASE = `    CASE relation
        WHEN 'father' THEN 'پدر'
        WHEN 'mother' THEN 'مادر'
        WHEN 'spouse' THEN 'همسر'
        WHEN 'child' THEN 'فرزند'
        WHEN 'brother' THEN 'برادر'
        WHEN 'sister' THEN 'خواهر'
        WHEN 'grandparent' THEN 'پدربزرگ / مادربزرگ'
        WHEN 'relative' THEN 'سایر فامیل درج شده'
        WHEN 'other' THEN 'سایر موارد (غیر فامیل)'
        ELSE relation -- اگر مقداری خارج از لیست بود خود همان را برمی‌گرداند
    END AS relation_persian`;

const ORIGINAL_QUERY = `SELECT 
    id, 
    name, 
    national_code,
${RELATION_CASE}
FROM users__patient 
WHERE user_id = $1;`;

const PATCHED_QUERY = `SELECT 
    id, 
    name, 
    national_code,
    mobile,
    gender,
    marital_status,
    relation,
    city,
    address,
    details,
    postal_code,
    latitude,
    longitude,
${RELATION_CASE}
FROM users__patient 
WHERE user_id = $1;`;

const env = Object.fromEntries(
  fs
    .readFileSync(
      path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env"),
      "utf8"
    )
    .split(/\r?\n/)
    .filter(l => l.trim() && !l.trim().startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const base = (env.N8N_URL || "").replace(/\/$/, "");
const revert = process.argv.includes("--revert");

const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!login.ok) throw new Error(`n8n login failed: ${login.status}`);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

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
  `${WORKFLOW_NAME}-patients-address-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const node = nodes.find(n => n.name === NODE_NAME);
if (!node) throw new Error(`node ${NODE_NAME} not found`);

const normalize = value => String(value || "").replace(/\s+/g, " ").trim();
const current = String(node.parameters?.query || "");
const target = revert ? ORIGINAL_QUERY : PATCHED_QUERY;
const expected = revert ? PATCHED_QUERY : ORIGINAL_QUERY;

if (normalize(current) === normalize(target)) {
  console.log("already in the requested state; nothing to do");
  process.exit(0);
}
if (normalize(current) !== normalize(expected)) {
  console.error("unexpected current query, refusing to overwrite:\n", current);
  process.exit(1);
}

node.parameters.query = target;

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

console.log(
  revert
    ? "reverted /patients query"
    : "/patients now returns the companion address"
);
