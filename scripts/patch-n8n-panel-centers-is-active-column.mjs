/**
 * Ensures GET /panel/centers returns `is_active` so the Super Admin list can
 * render the «فعال بودن مرکز» switch.
 *
 *   node scripts/patch-n8n-panel-centers-is-active-column.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "panel2";
const SQL_NODE = "MySQL1";

const NEEDLE = `c.phone as "تلفن", c.working_hours as "ساعات کاری",`;
const WITH_IS_ACTIVE = `c.phone as "تلفن", c.working_hours as "ساعات کاری",
       c.is_active AS is_active,`;
const WITH_IS_ACTIVE_AND_APPROVAL = `c.phone as "تلفن", c.working_hours as "ساعات کاری",
       c.is_active AS is_active,
       c.approval_status AS approval_status,`;

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
  `${WORKFLOW_NAME}-is-active-col-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const node = wf.nodes.find(n => n.name === SQL_NODE);
if (!node) throw new Error(`SQL node ${SQL_NODE} not found`);
const query = String(node.parameters?.query || "");

let next = query;
if (revert) {
  next = next
    .replace(/\s*c\.is_active AS is_active,\s*/g, "\n       ")
    .replace(/\s*c\.is_active AS is_active\s*/g, "\n       ");
  // Normalize accidental double commas / blank lines after revert.
  next = next.replace(/,\s*,/g, ",");
} else if (/c\.is_active\s+AS\s+is_active/i.test(query)) {
  console.log("is_active already selected; nothing to do");
  process.exit(0);
} else if (query.includes(`c.approval_status AS approval_status`)) {
  next = query.replace(
    NEEDLE,
    `c.phone as "تلفن", c.working_hours as "ساعات کاری",
       c.is_active AS is_active,`
  );
} else if (query.includes(NEEDLE)) {
  next = query.replace(NEEDLE, WITH_IS_ACTIVE);
} else {
  throw new Error("unexpected centers SQL shape; refusing to patch");
}

node.parameters.query = next;

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

console.log(revert ? "reverted is_active column" : "added c.is_active AS is_active");
// silence unused
void WITH_IS_ACTIVE_AND_APPROVAL;
