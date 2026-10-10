/**
 * Patch reminders workflow for companion (patient_id) + image_url.
 *   node scripts/patch-n8n-reminders-companion-image.mjs
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
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

const LIST_SQL = `SELECT r.id, r.user_id, r.patient_id, r.type, r.schedule_type, r.name, r.text, r.image_url,
       r.weekdays, r.dates, r.times, r.pre_reminders, r.channels, r.phone_number, r.bale_id,
       r.timezone, r.starts_at, r.finish_at, r.status, r.version, r.created_at, r.updated_at,
       p.name AS patient_name, p.relation AS patient_relation
FROM reminders r
LEFT JOIN users__patient p ON p.id = r.patient_id AND p.user_id = r.user_id
WHERE r.user_id = $1 AND r.deleted_at IS NULL
ORDER BY r.id DESC`;

const PARSE_SNIPPET_OLD = `const id = Number(b.id) || 0;`;
const PARSE_SNIPPET_NEW = `const id = Number(b.id) || 0;
const patient_id_raw = Number(b.patient_id || b.patientId || 0) || 0;
const patient_id = patient_id_raw > 0 ? patient_id_raw : null;
let image_url = b.image_url || b.imageUrl || null;
if (image_url != null) {
  image_url = String(image_url).trim();
  if (!image_url || !/^https?:\\/\\//i.test(image_url) || image_url.length > 512) image_url = null;
}`;

const PARSE_RETURN_OLD = `  phone_number, bale_id, finish_at, starts_at,
  timezone: 'Asia/Tehran'
}}];`;
const PARSE_RETURN_NEW = `  phone_number, bale_id, finish_at, starts_at,
  patient_id, image_url,
  timezone: 'Asia/Tehran'
}}];`;

const INSERT_SQL = `INSERT INTO reminders
  (user_id, patient_id, type, schedule_type, name, text, image_url, weekdays, dates, times, pre_reminders,
   channels, phone_number, bale_id, timezone, starts_at, finish_at, status, next_materialize_at, version)
VALUES
  ($1,
   (SELECT id FROM users__patient WHERE id = $2 AND user_id = $1 LIMIT 1),
   $3,$4,$5,$6,$7,$8,$9,$10,NULLIF($11,''),$12,$13,$14,'Asia/Tehran',$15,$16,'active', NOW(), 1);
SELECT LAST_INSERT_ID() AS id;`;

const INSERT_PARAMS = `={{ (() => { const j=$('NODE').first().json; return [j.user_id,j.patient_id,j.type,j.schedule_type,j.name,j.text,j.image_url,j.weekdays,j.dates,j.times,j.pre_reminders,j.channels,j.phone_number,j.bale_id,j.starts_at,j.finish_at]; })() }}`;

const UPDATE_SQL = `UPDATE reminders SET
  patient_id=(SELECT id FROM users__patient WHERE id = $3 AND user_id = $2 LIMIT 1),
  type=$4, schedule_type=$5, name=$6, text=$7, image_url=$8,
  weekdays=$9, dates=$10, times=$11,
  pre_reminders=NULLIF($12,''),
  channels=$13, phone_number=$14, bale_id=$15,
  starts_at=$16, finish_at=$17, version=version+1, status='active',
  next_materialize_at=NOW()
WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL;
UPDATE reminder_occurrences
  SET status='cancelled'
WHERE reminder_id=$1 AND user_id=$2 AND status IN ('pending','claimed','processing') AND fire_at >= NOW();
UPDATE reminder_deliveries d
  JOIN reminder_occurrences o ON o.id=d.occurrence_id
  SET d.status='cancelled'
WHERE o.reminder_id=$1 AND d.status IN ('pending','retry_wait','sending');
SELECT id, user_id, patient_id, type, schedule_type, name, text, image_url, weekdays, dates, times, pre_reminders,
       channels, phone_number, bale_id, starts_at, finish_at, status, version
FROM reminders WHERE id=$1 AND user_id=$2 LIMIT 1;`;

const UPDATE_PARAMS = `={{ (() => { const j=$('NODE').first().json; return [j.id,j.user_id,j.patient_id,j.type,j.schedule_type,j.name,j.text,j.image_url,j.weekdays,j.dates,j.times,j.pre_reminders,j.channels,j.phone_number,j.bale_id,j.starts_at,j.finish_at]; })() }}`;

const LIST_WRAP = authNode => `const auth = $('${authNode}').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'Unauthorized' } }];
const itemsOut = items.map(i => i.json).filter(r => r && r.id != null);
const reminders = itemsOut.map(r => ({
  ...r,
  schedule_type: r.schedule_type === 'every_day' ? 'everyDay'
    : r.schedule_type === 'every_year' ? 'everyYear'
    : r.schedule_type,
  chanels: r.channels,
  finishTime: r.finish_at,
  liomId: String(r.user_id),
  patientId: r.patient_id != null ? Number(r.patient_id) : null,
  patient_name: r.patient_name || null,
  imageUrl: r.image_url || null,
  image_url: r.image_url || null,
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
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === "reminders");
if (!summary) throw new Error("reminders workflow missing");

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync(
  path.join(backupDir, `reminders-companion-image-${stamp}.json`),
  JSON.stringify(wf, null, 1),
  "utf8"
);

function patchParse(nodeName) {
  const node = wf.nodes.find(n => n.name === nodeName);
  if (!node) throw new Error(`missing ${nodeName}`);
  let code = node.parameters.jsCode || "";
  if (!code.includes("patient_id")) {
    if (!code.includes(PARSE_SNIPPET_OLD)) {
      throw new Error(`${nodeName}: parse anchor missing`);
    }
    code = code.replace(PARSE_SNIPPET_OLD, PARSE_SNIPPET_NEW);
    if (!code.includes(PARSE_RETURN_OLD)) {
      throw new Error(`${nodeName}: return anchor missing`);
    }
    code = code.replace(PARSE_RETURN_OLD, PARSE_RETURN_NEW);
    node.parameters.jsCode = code;
    console.log("parse", nodeName);
  } else {
    console.log("parse skip", nodeName);
  }
}

function patchMysql(nodeName, query, paramsTpl, parseNode) {
  const node = wf.nodes.find(n => n.name === nodeName);
  if (!node) throw new Error(`missing ${nodeName}`);
  node.parameters.query = query;
  const params = paramsTpl.replace("NODE", parseNode);
  if (node.parameters.options) {
    node.parameters.options.queryReplacement = params;
  }
  // n8n mysql node variants
  if (node.parameters.queryReplacement != null) {
    node.parameters.queryReplacement = params;
  }
  // Some versions store under additionalFields
  if (!node.parameters.options) node.parameters.options = {};
  node.parameters.options.queryReplacement = params;
  console.log("sql", nodeName);
}

function patchListSql(nodeName) {
  const node = wf.nodes.find(n => n.name === nodeName);
  if (!node) throw new Error(`missing ${nodeName}`);
  node.parameters.query = LIST_SQL;
  console.log("list-sql", nodeName);
}

function patchWrap(nodeName, authName) {
  const node = wf.nodes.find(n => n.name === nodeName);
  if (!node) throw new Error(`missing ${nodeName}`);
  node.parameters.jsCode = LIST_WRAP(authName);
  console.log("wrap", nodeName);
}

patchParse("wh_reminders_add_parse");
patchParse("wh_user_task_add_parse");
patchParse("wh_reminders_edit_parse");
patchParse("wh_user_task_edit_parse");

patchMysql(
  "wh_reminders_add_insert",
  INSERT_SQL,
  INSERT_PARAMS,
  "wh_reminders_add_parse"
);
patchMysql(
  "wh_user_task_add_insert",
  INSERT_SQL,
  INSERT_PARAMS,
  "wh_user_task_add_parse"
);
patchMysql(
  "wh_reminders_edit_update",
  UPDATE_SQL,
  UPDATE_PARAMS,
  "wh_reminders_edit_parse"
);
patchMysql(
  "wh_user_task_edit_update",
  UPDATE_SQL,
  UPDATE_PARAMS,
  "wh_user_task_edit_parse"
);

patchListSql("wh_reminders_list_sql");
patchListSql("wh_user_task_list_sql");
patchWrap("wh_reminders_list_wrap", "wh_reminders_list_auth");
patchWrap("wh_user_task_list_wrap", "wh_user_task_list_auth");

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
