/** Patch the active `users` workflow so setProfile optionally persists isnotif.
 * A timestamped pre-change snapshot is always written to scripts/backup/.
 * Usage: node scripts/patch-n8n-user-isnotif.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW = "users";
const NODE = "MySQL";
const ORIGINAL_QUERY = `UPDATE users 
SET 
    name = COALESCE(NULLIF($1, ''), name),
    national_code = COALESCE(NULLIF($2, ''), national_code),
    city = COALESCE(NULLIF($3, ''), city),
    gender = COALESCE(NULLIF($4, ''), gender),
    birth_date = COALESCE(NULLIF($6, ''), birth_date)
WHERE id = $7`;
const ORIGINAL_REPLACEMENT = `={{$json.body.name}},{{$json.body.national_code}},{{$json.body.city}},{{$json.body.gender}},{{$json.body.birth_date}},{{ $json.jwtPayload.id }}`;
const PATCHED_QUERY = `UPDATE users
SET
    name = COALESCE(NULLIF($1, ''), name),
    national_code = COALESCE(NULLIF($2, ''), national_code),
    city = COALESCE(NULLIF($3, ''), city),
    gender = COALESCE(NULLIF($4, ''), gender),
    birth_date = COALESCE(NULLIF($5, ''), birth_date),
    isnotif = COALESCE($6, isnotif)
WHERE id = $7`;
const PATCHED_REPLACEMENT = `={{$json.body.name}},{{$json.body.national_code}},{{$json.body.city}},{{$json.body.gender}},{{$json.body.birth_date}},{{$json.body.isnotif === true ? 1 : $json.body.isnotif === false ? 0 : null}},{{ $json.jwtPayload.id }}`;

const envPath = path.join(process.cwd(), ".cursor", "sayban-ops", "secrets", "n8n_sayban.env");
const env = Object.fromEntries(fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter(line => line.trim() && !line.startsWith("#")).map(line => {
  const index = line.indexOf("=");
  return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
}));
const base = env.N8N_URL.replace(/\/$/, "");
const revert = process.argv.includes("--revert");
const login = await fetch(`${base}/rest/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailOrLdapLoginId: env.N8N_USER, password: env.N8N_PASSWORD }) });
if (!login.ok) throw new Error(`n8n login failed: ${login.status}`);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const headers = { Cookie: cookie, Accept: "application/json" };
const list = await fetch(`${base}/rest/workflows?limit=250`, { headers }).then(response => response.json());
const summary = list.data.find(item => item.name === WORKFLOW);
if (!summary) throw new Error("users workflow not found");
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, { headers }).then(response => response.json());
const workflow = detail.data || detail;
const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = path.join(backupDir, `users-isnotif-${stamp}.json`);
fs.writeFileSync(backup, JSON.stringify(workflow, null, 1), "utf8");
console.log(`backup: ${path.relative(process.cwd(), backup)}`);
const nodes = structuredClone(workflow.nodes);
const node = nodes.find(item => item.name === NODE);
if (!node) throw new Error("users/MySQL node not found");
node.parameters.query = revert ? ORIGINAL_QUERY : PATCHED_QUERY;
node.parameters.options.queryReplacement = revert ? ORIGINAL_REPLACEMENT : PATCHED_REPLACEMENT;
const response = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ name: workflow.name, nodes, connections: workflow.connections, settings: workflow.settings || {} })
});
if (!response.ok) throw new Error(`patch failed: ${response.status} ${await response.text()}`);
console.log(revert ? "users/isnotif reverted" : "users/isnotif patched");
