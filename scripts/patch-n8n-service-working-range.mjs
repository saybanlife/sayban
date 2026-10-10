/**
 * Additive bulk availability endpoint for the visit booking picker.
 *
 * Apply:    node scripts/patch-n8n-service-working-range.mjs
 * Rollback: node scripts/patch-n8n-service-working-range.mjs --revert
 *
 * The legacy GET /service/working/ branch is not changed.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const WORKFLOW_NAME = "sayban2";
const PREFIX = "working_range";
const NAMES = {
  webhook: `${PREFIX}_webhook`,
  validate: `${PREFIX}_validate`,
  query: `${PREFIX}_query`,
  format: `${PREFIX}_format`,
  respond: `${PREFIX}_respond`
};
const revert = process.argv.includes("--revert");

const envFile = [
  path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env"),
  path.join(process.cwd(), ".env.local")
].find(file => fs.existsSync(file));
if (!envFile) throw new Error("n8n credentials file not found");
const env = Object.fromEntries(
  fs.readFileSync(envFile, "utf8").split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith("#") && line.includes("="))
    .map(line => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);
const base = String(env.N8N_URL || "").replace(/\/$/, "");

const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ emailOrLdapLoginId: env.N8N_USER, password: env.N8N_PASSWORD })
});
if (!login.ok) throw new Error(`n8n login failed: ${login.status}`);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(response => response.json());
const summary = (list.data || []).find(item => item.name === WORKFLOW_NAME);
if (!summary) throw new Error(`${WORKFLOW_NAME} workflow not found`);

async function loadWorkflow() {
  const response = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`workflow fetch failed: ${response.status}`);
  const payload = await response.json();
  return payload.data || payload;
}

const workflow = await loadWorkflow();
const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `sayban2-working-range-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = JSON.parse(JSON.stringify(workflow.nodes));
const connections = JSON.parse(JSON.stringify(workflow.connections));
const managedNames = new Set(Object.values(NAMES));

if (revert) {
  nodes = nodes.filter(node => !managedNames.has(node.name));
  for (const name of managedNames) delete connections[name];
  for (const connection of Object.values(connections)) {
    for (const branch of connection.main || []) {
      if (Array.isArray(branch)) {
        for (let index = branch.length - 1; index >= 0; index -= 1) {
          if (managedNames.has(branch[index]?.node)) branch.splice(index, 1);
        }
      }
    }
  }
} else {
  if (nodes.some(node => managedNames.has(node.name))) {
    nodes = nodes.filter(node => !managedNames.has(node.name));
    for (const name of managedNames) delete connections[name];
  }
  const mysqlCredentials = nodes.find(node => node.credentials?.mySql)?.credentials;
  if (!mysqlCredentials?.mySql) throw new Error("MySQL credential missing from workflow");

  const validateCode = `const q = $json.query || {};
const datePattern = /^\\d{4}-\\d{2}-\\d{2}$/;
const from = String(q.date_from || '');
const to = String(q.date_to || '');
if (!datePattern.test(from) || !datePattern.test(to)) throw new Error('Invalid date range');
const start = new Date(from + 'T00:00:00Z');
const end = new Date(to + 'T00:00:00Z');
const days = Math.round((end - start) / 86400000);
if (!Number.isFinite(days) || days < 0 || days > 62) throw new Error('Date range must be 0..62 days');
const id = Number(q.id || 0);
const code = String(q.service_code || '').toUpperCase();
const centerId = String(q.center_id || '');
if ((!Number.isInteger(id) || id < 1) && (code !== 'VISIT' || !/^[a-f0-9]{32}$/i.test(centerId))) {
  throw new Error('Invalid service');
}
return [{ json: { id, code, centerId, from, to } }];`;

  const query = `WITH RECURSIVE date_range AS (
  SELECT CAST($4 AS DATE) AS slot_date
  UNION ALL
  SELECT DATE_ADD(slot_date, INTERVAL 1 DAY) FROM date_range WHERE slot_date < CAST($5 AS DATE)
), resolved AS (
  SELECT s.id AS service_id, s.duration_minutes,
         COALESCE(s.center_id, (SELECT c.id FROM centers c WHERE MD5(c.id) = $3 LIMIT 1)) AS center_id
  FROM centers__services s
  WHERE ($2 <> '' AND s.code = $2 AND s.center_id IS NULL AND s.is_active = 1)
     OR ($2 = '' AND s.id = $1)
  LIMIT 1
)
SELECT DATE_FORMAT(d.slot_date, '%Y-%m-%d') AS slot_date,
       resolved.service_id, resolved.center_id, resolved.duration_minutes,
       wh.open_time AS day_start, wh.close_time AS day_end, wh.holidays,
       r.id AS reservation_id, r.start_time AS reservation_start, r.end_time AS reservation_end
FROM date_range d
LEFT JOIN resolved ON 1=1
LEFT JOIN centers__working_hours wh
  ON wh.center_id = resolved.center_id
 AND wh.is_closed = 0
 AND wh.day_of_week = ELT(DAYOFWEEK(d.slot_date), 'Sun','Mon','Tue','Wed','Thu','Fri','Sat')
 AND (wh.service_id = resolved.service_id OR (wh.service_id IS NULL AND NOT EXISTS (
      SELECT 1 FROM centers__working_hours service_hours
      WHERE service_hours.center_id = resolved.center_id
        AND service_hours.service_id = resolved.service_id
        AND service_hours.day_of_week = wh.day_of_week
  )))
LEFT JOIN reservations r
  ON r.service_id = resolved.service_id
 AND r.center_id = resolved.center_id
 AND r.status <> 'canceled'
 AND r.start_time IS NOT NULL
 AND DATE(r.start_time) = d.slot_date
ORDER BY d.slot_date, r.start_time`;

  const formatCode = `const rows = $input.all().map(item => item.json);
const nowText = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
const nowMatch = nowText.match(/(\\d{4})-(\\d{2})-(\\d{2}).*?(\\d{2}):(\\d{2})/);
const today = nowMatch ? nowMatch.slice(1, 4).join('-') : '';
const nowMinutes = nowMatch ? Number(nowMatch[4]) * 60 + Number(nowMatch[5]) : -1;
const minutes = value => { const match = String(value || '').match(/(\\d{1,2}):(\\d{2})/); return match ? Number(match[1]) * 60 + Number(match[2]) : null; };
const clock = value => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
const periodOf = value => value >= 300 && value < 720 ? 'morning' : value < 1020 ? 'noon' : 'evening_night';
const grouped = new Map();
for (const row of rows) {
  const date = String(row.slot_date || '');
  if (!grouped.has(date)) grouped.set(date, { config: row, reservations: new Map() });
  if (row.reservation_id != null) grouped.get(date).reservations.set(String(row.reservation_id), row);
}
const result = [];
for (const [date, day] of grouped) {
  const start = minutes(day.config.day_start);
  const end = minutes(day.config.day_end);
  const duration = Number(day.config.duration_minutes);
  const periods = { morning: [], noon: [], evening_night: [] };
  if (start != null && end != null && duration > 0) {
    for (let cursor = start; cursor + duration <= end; cursor += duration + 5) {
      if (date < today || (date === today && cursor <= nowMinutes)) continue;
      const slotEnd = cursor + duration;
      const booked = [...day.reservations.values()].some(reservation => {
        const startMatch = String(reservation.reservation_start || '').match(/(\\d{2}):(\\d{2})/);
        const endMatch = String(reservation.reservation_end || '').match(/(\\d{2}):(\\d{2})/);
        if (!startMatch || !endMatch) return false;
        const reservationStart = Number(startMatch[1]) * 60 + Number(startMatch[2]);
        const reservationEnd = Number(endMatch[1]) * 60 + Number(endMatch[2]);
        return cursor < reservationEnd && slotEnd > reservationStart;
      });
      periods[periodOf(cursor)].push({ slot_start: clock(cursor), slot_end: clock(slotEnd), status: booked ? 'booked' : 'available' });
    }
  }
  result.push({ date, result: Object.entries(periods).filter(([, slots]) => slots.length).map(([period, slots]) => ({ period, slots })) });
}
return [{ json: { success: true, result } }];`;

  const makeNode = (name, type, typeVersion, position, parameters, extra = {}) => ({
    id: randomUUID(), name, type, typeVersion, position, parameters, ...extra
  });
  nodes.push(
    makeNode(NAMES.webhook, "n8n-nodes-base.webhook", 2, [-80, 1540], {
      httpMethod: "GET", path: "/service/working/range/", responseMode: "responseNode", options: {}
    }, { webhookId: randomUUID() }),
    makeNode(NAMES.validate, "n8n-nodes-base.code", 2, [140, 1540], { jsCode: validateCode }),
    makeNode(NAMES.query, "n8n-nodes-base.mySql", 2.4, [360, 1540], {
      operation: "executeQuery", query,
      options: { queryReplacement: `={{ $json.id }},{{ $json.code }},{{ $json.centerId }},{{ $json.from }},{{ $json.to }}` }
    }, { credentials: mysqlCredentials }),
    makeNode(NAMES.format, "n8n-nodes-base.code", 2, [580, 1540], { jsCode: formatCode }),
    makeNode(NAMES.respond, "n8n-nodes-base.respondToWebhook", 1.4, [800, 1540], { options: {} })
  );
  connections[NAMES.webhook] = { main: [[{ node: NAMES.validate, type: "main", index: 0 }]] };
  connections[NAMES.validate] = { main: [[{ node: NAMES.query, type: "main", index: 0 }]] };
  connections[NAMES.query] = { main: [[{ node: NAMES.format, type: "main", index: 0 }]] };
  connections[NAMES.format] = { main: [[{ node: NAMES.respond, type: "main", index: 0 }]] };
}

const patch = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: workflow.name, nodes, connections,
    settings: workflow.settings || {}, staticData: workflow.staticData
  })
});
if (!patch.ok) throw new Error(`workflow patch failed: ${patch.status} ${await patch.text()}`);

const verified = await loadWorkflow();
const present = Object.values(NAMES).every(name => verified.nodes.some(node => node.name === name));
if (present === revert) throw new Error("workflow verification failed");
console.log(revert ? "bulk working endpoint reverted and verified" : "bulk working endpoint applied and verified");
