/**
 * Align catalog webhook payloads with Liad UI (category / occasions / suggestions).
 *   node scripts/patch-n8n-reminders-catalog-shape.mjs
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

const WRAPS = {
  wh_categories_wrap: `const rows = items.map(i => i.json).filter(r => r && (r.id != null || r.code));
const category = rows.map(r => {
  const name = r.code || r.name;
  const name_fa = r.title_fa || r.name_fa || r.name;
  const icon = r.icon === 'medicine' ? 'medicine_time' : (r.icon === 'gift' ? 'occasion' : (r.icon || r.code || 'medicine_time'));
  return {
    ...r,
    name,
    name_fa,
    label: name_fa,
    value: name,
    icon,
    is_addable: 1
  };
});
// Every category is selectable in Liad UI.
const type = category.map(r => ({
  category_name: r.name,
  category_name_fa: r.name_fa,
  icon: r.icon,
  items: [{
    type: r.name,
    type_fa: r.name_fa,
    name: r.name_fa,
    name_fa: r.name_fa,
    title_fa: r.name_fa,
    label: r.name_fa,
    value: r.name,
    icon: r.icon || r.name,
    schedule_type: r.name === 'medicine_time' ? 'everyDay' : 'everyYear',
    text: r.name === 'medicine_time' ? 'زمان مصرف دارو فرا رسیده است.' : r.name_fa,
    __addDisabled: false
  }]
}));
return [{ json: { success: true, category, type, result: category } }];`,
  wh_occasions_wrap: `const rows = items.map(i => i.json).filter(r => r && r.id != null);
return [{ json: { success: true, result: rows, occasions: rows } }];`,
  wh_suggestions_wrap: `const rows = items.map(i => i.json).filter(r => r && r.id != null);
return [{ json: { success: true, result: rows, suggestions: rows } }];`
};

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
    `reminders-catalog-shape-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

for (const [name, code] of Object.entries(WRAPS)) {
  const node = wf.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`missing ${name}`);
  node.parameters.jsCode = code;
  console.log("patched", name);
}

const patch = await fetch(`${base}/rest/workflows/${summary.id}`, {
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
if (!patch.ok) throw new Error(`patch ${patch.status} ${await patch.text()}`);
console.log("done");
