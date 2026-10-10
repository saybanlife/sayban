/**
 * Backend half of the «رزرو وقت بازدید» (visit booking) rework.
 *
 * Before: a visit was booked against one of the center's own clinical services
 * (the client fell back to `services[0]`), so it was stored — and later shown in
 * the panel — as e.g. «فیزیوتراپی». Available slots were also looked up by that
 * service id.
 *
 * After: there is exactly one visit service, `centers__services.code = 'VISIT'`
 * with `center_id IS NULL` (see scripts/sql/visit_reservation_service.sql). The
 * client now sends `service_code=VISIT` plus the center's public (MD5) id, and
 * these nodes resolve it server-side:
 *
 *   reservations / MySQL1   also returns the visit service id
 *   reservations / MySQL8   stores that id when body.service_code = 'VISIT'
 *   sayban2 / MySQL5        resolves service by code, center by MD5 id
 *   sayban2 / working1      uses the resolved service id
 *   sayban2 / reservation   scopes booked slots to the center, not just service
 *                           (the visit service is shared by every center)
 *   sayban2 / holidays      falls back to the center's own holiday rows
 *
 *   node scripts/patch-n8n-visit-reservation.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const revert = process.argv.includes("--revert");

/** @type {{workflow: string, node: string, field: string, before: string, after: string}[]} */
const EDITS = [
  {
    workflow: "reservations",
    node: "MySQL1",
    field: "query",
    before: "SELECT id FROM `centers` WHERE MD5(id)=$1",
    after: `SELECT
  c.id,
  (SELECT s.id
     FROM \`centers__services\` s
     WHERE s.code = 'VISIT' AND s.center_id IS NULL AND s.is_active = 1
     LIMIT 1) AS visit_service_id
FROM \`centers\` c
WHERE MD5(c.id) = $1`
  },
  {
    workflow: "reservations",
    node: "MySQL8",
    field: "options.queryReplacement",
    before:
      "={{ $json.id }},{{ $('reservations').item.json.body.service_id }},{{ $('reservations').item.json.jwtPayload.id }},'{{ $('reservations').item.json.body.start_time }}','{{ $('reservations').item.json.body.end_time }}',{{ $('reservations').item.json.body.final_price }},'{{ $('reservations').item.json.body.service_location }}',{{ $('reservations').item.json.body.patient_id }}",
    after:
      "={{ $json.id }},{{ $('reservations').item.json.body.service_code === 'VISIT' ? $json.visit_service_id : $('reservations').item.json.body.service_id }},{{ $('reservations').item.json.jwtPayload.id }},'{{ $('reservations').item.json.body.start_time }}','{{ $('reservations').item.json.body.end_time }}',{{ $('reservations').item.json.body.final_price }},'{{ $('reservations').item.json.body.service_location }}',{{ $('reservations').item.json.body.patient_id }}"
  },
  {
    workflow: "sayban2",
    node: "MySQL5",
    field: "query",
    before:
      "SELECT `duration_minutes`,`center_id`  FROM `centers__services` WHERE `id`=$1",
    after: `SELECT
  s.\`id\` AS service_id,
  s.\`duration_minutes\`,
  COALESCE(
    s.\`center_id\`,
    (SELECT c.id FROM \`centers\` c WHERE MD5(c.id) = $3)
  ) AS \`center_id\`
FROM \`centers__services\` s
WHERE ($2 <> '' AND s.\`code\` = $2 AND s.\`center_id\` IS NULL)
   OR ($2 = '' AND s.\`id\` = $1)
LIMIT 1`
  },
  {
    workflow: "sayban2",
    node: "MySQL5",
    field: "options.queryReplacement",
    before: "={{ $json.query.id }}",
    after:
      "={{ $json.query.id || 0 }},{{ $json.query.service_code || '' }},{{ $json.query.center_id || '' }}"
  },
  {
    workflow: "sayban2",
    node: "working1",
    field: "options.queryReplacement",
    before:
      "={{ $('working').item.json.query.id }},{{ $('working').item.json.query.date }}, {{ $json.center_id  }}",
    after:
      "={{ $('MySQL5').item.json.service_id }},{{ $('working').item.json.query.date }},{{ $json.center_id }}"
  },
  {
    workflow: "sayban2",
    node: "reservation",
    field: "query",
    before: `SELECT 
    id AS reservation_id,
    user_id,
    start_time AS reservation_start,
    end_time AS reservation_end,
    final_price,
    payment_method,
    payment_status,
    status AS reservation_status,
    created_at
FROM reservations
WHERE service_id = $1
  AND status != 'canceled'
  AND DATE(start_time) = $2
ORDER BY start_time;
`,
    after: `SELECT 
    id AS reservation_id,
    user_id,
    start_time AS reservation_start,
    end_time AS reservation_end,
    final_price,
    payment_method,
    payment_status,
    status AS reservation_status,
    created_at
FROM reservations
WHERE service_id = $1
  AND center_id = $3
  AND status != 'canceled'
  AND start_time IS NOT NULL
  AND DATE(start_time) = $2
ORDER BY start_time;
`
  },
  {
    workflow: "sayban2",
    node: "reservation",
    field: "options.queryReplacement",
    before:
      "={{ $('working').item.json.query.id }},{{ $('working').item.json.query.date }}",
    after:
      "={{ $('MySQL5').item.json.service_id }},{{ $('working').item.json.query.date }},{{ $('MySQL5').item.json.center_id }}"
  },
  {
    workflow: "sayban2",
    node: "holidays",
    field: "query",
    before: "SELECT holidays FROM `centers__working_hours` WHERE `service_id`=$1",
    after: `SELECT \`holidays\` FROM \`centers__working_hours\`
WHERE ($1 <> '' AND \`service_id\` = $1)
   OR ($1 = '' AND \`service_id\` IS NULL
       AND \`center_id\` = (SELECT c.id FROM \`centers\` c WHERE MD5(c.id) = $2))`
  },
  {
    workflow: "sayban2",
    node: "holidays",
    field: "options.queryReplacement",
    before: "={{ $('holiday').item.json.query.id }}",
    after:
      "={{ $('holiday').item.json.query.id || '' }},{{ $('holiday').item.json.query.center_id || '' }}"
  }
];

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

const normalize = value => String(value ?? "").replace(/\s+/g, " ").trim();

function readField(node, field) {
  return field
    .split(".")
    .reduce((acc, key) => (acc == null ? acc : acc[key]), node.parameters);
}

function writeField(node, field, value) {
  const keys = field.split(".");
  let target = node.parameters;
  for (const key of keys.slice(0, -1)) {
    target[key] = target[key] || {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const workflows = [...new Set(EDITS.map(e => e.workflow))];
let changed = 0;

for (const name of workflows) {
  const summary = (list.data || []).find(w => w.name === name);
  if (!summary) throw new Error(`workflow ${name} not found`);

  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const wf = detail.data || detail;

  const backupFile = path.join(backupDir, `${name}-visit-reservation-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
  console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

  const nodes = JSON.parse(JSON.stringify(wf.nodes));
  let dirty = false;

  for (const edit of EDITS.filter(e => e.workflow === name)) {
    const node = nodes.find(n => n.name === edit.node);
    if (!node) throw new Error(`${name}: node ${edit.node} not found`);

    const current = readField(node, edit.field);
    const target = revert ? edit.before : edit.after;
    const expected = revert ? edit.after : edit.before;

    if (normalize(current) === normalize(target)) {
      console.log(`  = ${name}/${edit.node}.${edit.field} already current`);
      continue;
    }
    if (normalize(current) !== normalize(expected)) {
      console.error(
        `  ! ${name}/${edit.node}.${edit.field} unexpected value, refusing:\n${current}`
      );
      process.exit(1);
    }

    writeField(node, edit.field, target);
    console.log(`  + ${name}/${edit.node}.${edit.field} updated`);
    dirty = true;
  }

  if (!dirty) continue;

  const res = await fetch(`${base}/rest/workflows/${summary.id}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: wf.name,
      nodes,
      connections: wf.connections,
      settings: wf.settings || {}
    })
  });
  if (!res.ok) throw new Error(`patch ${name} failed: ${res.status} ${await res.text()}`);
  changed += 1;
}

console.log(
  changed === 0
    ? "nothing to do"
    : revert
      ? `reverted ${changed} workflow(s)`
      : `patched ${changed} workflow(s) for the shared visit service`
);
