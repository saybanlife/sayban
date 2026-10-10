/**
 * Patch reminders list response to include `reminders` (UI contract).
 *   node scripts/patch-n8n-reminders-list-shape.mjs
 */
import fs from "node:fs";
import path from "node:path";

function readEnv() {
  const envPath = path.join(
    process.cwd(),
    ".cursor/sayban-ops/secrets/n8n_sayban.env"
  );
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

const NEW_WRAP = (authNode) => `const auth = $('${authNode}').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'Unauthorized' } }];
const itemsOut = items.map(i => i.json).filter(r => r && r.id != null);
// Normalize schedule_type for legacy UI (everyDay / everyYear)
const reminders = itemsOut.map(r => ({
  ...r,
  schedule_type: r.schedule_type === 'every_day' ? 'everyDay'
    : r.schedule_type === 'every_year' ? 'everyYear'
    : r.schedule_type,
  chanels: r.channels,
  finishTime: r.finish_at,
  liomId: String(r.user_id),
  active: r.status === 'active' ? 1 : 0
}));
return [{ json: { success: true, result: reminders, items: reminders, reminders } }];
`;

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
if (!loginRes.ok) throw new Error(`login ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie }
}).then((r) => r.json());
const summary = (list.data || []).find((w) => w.name === "reminders");
if (!summary) throw new Error("reminders workflow missing");

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then((r) => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `reminders-list-shape-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const patches = {
  wh_reminders_list_wrap: "wh_reminders_list_auth",
  wh_user_task_list_wrap: "wh_user_task_list_auth"
};

for (const [nodeName, authName] of Object.entries(patches)) {
  const node = wf.nodes.find((n) => n.name === nodeName);
  if (!node) throw new Error(`missing ${nodeName}`);
  node.parameters.jsCode = NEW_WRAP(authName);
  console.log("patched", nodeName);
}

const put = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
    staticData: wf.staticData ?? null,
    active: true,
    ...(wf.versionId ? { versionId: wf.versionId } : {})
  })
});
if (!put.ok) throw new Error(`patch ${put.status} ${await put.text()}`);
console.log("patched workflow ok");
console.log("done");
