/**
 * Fix MariaDB 10.3 incompatibilities in reminders workflow SQL
 * (no CAST(x AS JSON); prefer raw JSON strings).
 *
 *   node scripts/patch-n8n-reminders-mariadb-json.mjs
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

const INSERT_SQL = `INSERT INTO reminders
  (user_id, type, schedule_type, name, text, weekdays, dates, times, pre_reminders,
   channels, phone_number, bale_id, timezone, starts_at, finish_at, status, next_materialize_at, version)
VALUES
  ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,''),$10,$11,$12,'Asia/Tehran',$13,$14,'active', NOW(), 1);
SELECT LAST_INSERT_ID() AS id;`;

const EDIT_SQL = `UPDATE reminders SET
  type=$3, schedule_type=$4, name=$5, text=$6,
  weekdays=$7, dates=$8, times=$9,
  pre_reminders=NULLIF($10,''),
  channels=$11, phone_number=$12, bale_id=$13,
  starts_at=$14, finish_at=$15, version=version+1, status='active',
  next_materialize_at=NOW()
WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL;
UPDATE reminder_occurrences
  SET status='cancelled'
WHERE reminder_id=$1 AND user_id=$2 AND status IN ('pending','claimed','processing') AND fire_at >= NOW();
UPDATE reminder_deliveries d
  JOIN reminder_occurrences o ON o.id=d.occurrence_id
  SET d.status='cancelled'
WHERE o.reminder_id=$1 AND d.status IN ('pending','retry_wait','sending');
SELECT id, user_id, type, schedule_type, name, text, weekdays, dates, times, pre_reminders,
       channels, phone_number, bale_id, starts_at, finish_at, status, version
FROM reminders WHERE id=$1 AND user_id=$2 LIMIT 1;`;

function fixJsCode(code) {
  if (!code || typeof code !== "string") return code;
  return code
    .replace(/CAST\(\? AS JSON\)/g, "?")
    .replace(/CAST\(\$(\d+) AS JSON\)/g, "$$$1");
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
    `reminders-mariadb-json-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

let changed = 0;
for (const node of wf.nodes) {
  if (
    node.name === "wh_reminders_add_insert" ||
    node.name === "wh_user_task_add_insert"
  ) {
    node.parameters.query = INSERT_SQL;
    changed++;
    console.log("fixed insert", node.name);
  }
  if (
    node.name === "wh_reminders_edit_update" ||
    node.name === "wh_user_task_edit_update"
  ) {
    node.parameters.query = EDIT_SQL;
    changed++;
    console.log("fixed edit", node.name);
  }
  if (node.type === "n8n-nodes-base.code" && node.parameters?.jsCode) {
    const next = fixJsCode(node.parameters.jsCode);
    if (next !== node.parameters.jsCode) {
      node.parameters.jsCode = next;
      changed++;
      console.log("fixed code CAST", node.name);
    }
  }
  if (typeof node.parameters?.query === "string") {
    const next = fixJsCode(node.parameters.query);
    if (next !== node.parameters.query) {
      node.parameters.query = next;
      changed++;
      console.log("fixed query CAST", node.name);
    }
  }
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
console.log("changed", changed, "done");
