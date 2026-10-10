/**
 * Patch panel/panel2 MySQL INSERT for /add/service to persist duration_mode.
 *
 *   node scripts/patch-n8n-staff-service-duration-insert.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAMES = ["panel", "panel2"];

const OLD_SQL = `INSERT INTO \`centers__services\` (
    \`center_id\`, 
    \`name\`, 
    \`description\`, 
    \`duration_minutes\`, 
    \`buffer_minutes\`,
    \`category\`
) VALUES (
    NULLIF($1, ''), 
    $2, 
    $3,
    $4, 
    $5,
    $6

)
`;

const NEW_SQL = `INSERT INTO \`centers__services\` (
    \`center_id\`, 
    \`name\`, 
    \`description\`, 
    \`duration_minutes\`, 
    \`buffer_minutes\`,
    \`category\`,
    \`duration_mode\`
) VALUES (
    NULLIF($1, ''), 
    $2, 
    $3,
    $4, 
    $5,
    $6,
    NULLIF($7, '')
)
`;

const OLD_REPL =
  "={{$('add/service').item.json.body.center_id}},{{ $json.service.name }},{{ $json.service.description }},{{ $json.service.duration_minutes }},{{ $json.service.buffer_minutes }},{{ $json.service.category }}";
const NEW_REPL =
  "={{$('add/service').item.json.body.center_id}},{{ $json.service.name }},{{ $json.service.description }},{{ $json.service.duration_minutes }},{{ $json.service.buffer_minutes }},{{ $json.service.category }},{{ $json.service.duration_mode || '' }}";

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

for (const name of WORKFLOW_NAMES) {
  const summary = (list.data || []).find(w => w.name === name);
  if (!summary) continue;
  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const wf = detail.data || detail;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(
    path.join(backupDir, `${name}-duration-insert-${stamp}.json`),
    JSON.stringify(wf, null, 1),
    "utf8"
  );

  const nodes = JSON.parse(JSON.stringify(wf.nodes));
  let changed = 0;
  for (const node of nodes) {
    const query = String(node.parameters?.query || "");
    if (!/INSERT INTO [`']?centers__services/i.test(query)) continue;
    if (!/`category`/i.test(query)) continue;
    if (!/`buffer_minutes`/i.test(query)) continue;

    if (revert) {
      if (!/duration_mode/i.test(query)) continue;
      node.parameters.query = OLD_SQL;
      if (node.parameters.options) {
        node.parameters.options.queryReplacement = OLD_REPL;
      }
      changed += 1;
      console.log(`${name}/${node.name}: reverted`);
      continue;
    }

    if (/duration_mode/i.test(query)) {
      console.log(`${name}/${node.name}: already patched`);
      continue;
    }

    node.parameters.query = NEW_SQL;
    node.parameters.options = {
      ...(node.parameters.options || {}),
      queryReplacement: NEW_REPL
    };
    changed += 1;
    console.log(`${name}/${node.name}: patched duration_mode`);
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
    throw new Error(`${name}: ${patchRes.status} ${await patchRes.text()}`);
  }
  console.log(`${name}: patched OK`);
}
