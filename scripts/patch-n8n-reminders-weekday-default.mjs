/**
 * Patch live reminders workflow PARSE nodes: default empty every_day weekdays
 * to all 7 days (matches Liad homepage weekday filter).
 *
 *   node scripts/patch-n8n-reminders-weekday-default.mjs
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

const NEEDLE = "const weekdays = parseJsonArray(b.weekdays);";
const REPLACEMENT = `let weekdays = parseJsonArray(b.weekdays);`;
const AFTER_DATES = "const dates = parseJsonArray(b.dates);";
const INJECT = `const dates = parseJsonArray(b.dates);
// Liad UI often omits weekdays on create; homepage filters by weekday.
if (schedule_type === 'every_day' && weekdays.length === 0) {
  weekdays = ['saturday','sunday','monday','tuesday','wednesday','thursday','friday'];
}`;

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
    `reminders-weekday-default-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

let patched = 0;
for (const node of wf.nodes || []) {
  const code = node.parameters?.jsCode;
  if (typeof code !== "string" || !code.includes(NEEDLE)) continue;
  if (code.includes("weekdays.length === 0")) {
    console.log("already patched", node.name);
    continue;
  }
  let next = code.replace(NEEDLE, REPLACEMENT);
  if (!next.includes(AFTER_DATES)) throw new Error(`no dates line in ${node.name}`);
  next = next.replace(AFTER_DATES, INJECT);
  node.parameters.jsCode = next;
  patched += 1;
  console.log("patched", node.name);
}

if (!patched) {
  console.log("no nodes needed patch (or already done)");
} else {
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
  console.log("done", patched);
}
