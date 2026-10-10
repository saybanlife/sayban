/**
 * Wire sendLogToTel for nurse suggest (panel/centersOffers) and select
 * (reservations/steff/update). Preserves existing URL + body field structure.
 *
 *   node scripts/patch-n8n-nurse-offer-select-logs.mjs
 */
import crypto from "node:crypto";
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

const BOT_ID = "8577173288:AAHW0nK9mPC5nm90KR_0TPIGr4RU_qbxdVw";
const CHAT_ID = "-1004484936841";
const LOG_URL = "https://n7n.staas.ir/webhook/sendLogToTel";

const SUGGEST_LOOKUP_SQL_FINAL = `SELECT
  r.status AS current_status,
  r.user_id AS user_id,
  COALESCE(u.name, '') AS user_name,
  COALESCE(
    (SELECT id FROM centers WHERE id = '{{ $("categories7").first().json.body.center_id }}' LIMIT 1),
    r.center_id
  ) AS center_id,
  COALESCE(
    (SELECT name FROM centers WHERE id = '{{ $("categories7").first().json.body.center_id }}' LIMIT 1),
    (SELECT name FROM centers WHERE id = r.center_id LIMIT 1),
    ''
  ) AS center_name,
  '{{ $("categories7").first().json.body.staff_id }}' AS staff_id,
  COALESCE(
    (SELECT name FROM centers__staffs WHERE id = '{{ $("categories7").first().json.body.staff_id }}' LIMIT 1),
    ''
  ) AS staff_name
FROM reservations r
LEFT JOIN users u ON u.id = r.user_id
WHERE r.id = '{{ $("categories7").first().json.body.reservation_id }}'
LIMIT 1`;

const SELECT_LOOKUP_SQL = `SELECT
  COALESCE(r.user_id, '{{ $("reservations2").first().json.jwtPayload.id }}') AS user_id,
  COALESCE(u.name, '') AS user_name,
  COALESCE(
    (SELECT id FROM centers__staffs WHERE id = '{{ $("reservations2").first().json.body.staff_id }}' LIMIT 1),
    (SELECT staff_id FROM centers__offers WHERE id = '{{ $("reservations2").first().json.body.staff_id }}' LIMIT 1),
    '{{ $("reservations2").first().json.body.staff_id }}'
  ) AS staff_id,
  COALESCE(
    (SELECT name FROM centers__staffs WHERE id = '{{ $("reservations2").first().json.body.staff_id }}' LIMIT 1),
    (SELECT s.name FROM centers__offers o JOIN centers__staffs s ON s.id = o.staff_id WHERE o.id = '{{ $("reservations2").first().json.body.staff_id }}' LIMIT 1),
    ''
  ) AS staff_name,
  COALESCE(
    (SELECT id FROM centers WHERE id = '{{ $("reservations2").first().json.body.center_id }}' LIMIT 1),
    (SELECT center_id FROM centers__offers WHERE id = '{{ $("reservations2").first().json.body.staff_id }}' LIMIT 1),
    r.center_id,
    '{{ $("reservations2").first().json.body.center_id }}'
  ) AS center_id,
  COALESCE(
    (SELECT name FROM centers WHERE id = '{{ $("reservations2").first().json.body.center_id }}' LIMIT 1),
    (SELECT c.name FROM centers__offers o JOIN centers c ON c.id = o.center_id WHERE o.id = '{{ $("reservations2").first().json.body.staff_id }}' LIMIT 1),
    (SELECT name FROM centers WHERE id = r.center_id LIMIT 1),
    ''
  ) AS center_name
FROM reservations r
LEFT JOIN users u ON u.id = COALESCE(r.user_id, '{{ $("reservations2").first().json.jwtPayload.id }}')
WHERE r.id = '{{ $("reservations2").first().json.body.id }}'
LIMIT 1`;

function logHttpNode({ id, name, position, titleExpr }) {
  return {
    parameters: {
      method: "POST",
      url: LOG_URL,
      sendBody: true,
      bodyParameters: {
        parameters: [
          { name: "bot_id", value: BOT_ID },
          { name: "chat_id", value: CHAT_ID },
          { name: "text", value: titleExpr },
          { name: "parse_mode", value: "HTML" },
        ],
      },
      options: {},
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    id,
    name,
    onError: "continueRegularOutput",
  };
}

function mysqlLookupNode({ id, name, position, query, credentials }) {
  return {
    parameters: {
      operation: "executeQuery",
      query,
      options: {},
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position,
    id,
    name,
    credentials,
    onError: "continueRegularOutput",
  };
}

function ensureOutgoing(connections, from, to) {
  if (!connections[from]) connections[from] = { main: [[]] };
  if (!connections[from].main) connections[from].main = [[]];
  if (!connections[from].main[0]) connections[from].main[0] = [];
  const exists = connections[from].main[0].some((t) => t.node === to);
  if (!exists) {
    connections[from].main[0].push({ node: to, type: "main", index: 0 });
  }
}

const SUGGEST_TEXT =
  '=پیشنهاد پرستار\nکاربر: {{ $json.user_name }} (شناسه {{ $json.user_id }})\nمرکز: {{ $json.center_name }} (شناسه {{ $json.center_id }})\nپرستار: {{ $json.staff_name }} (شناسه {{ $json.staff_id }})';

const SELECT_TEXT =
  '=انتخاب پرستار\nکاربر: {{ $json.user_name }} (شناسه {{ $json.user_id }})\nمرکز: {{ $json.center_name }} (شناسه {{ $json.center_id }})\nپرستار: {{ $json.staff_name }} (شناسه {{ $json.staff_id }})';

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const loginRes = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD,
  }),
});
if (!loginRes.ok) throw new Error(`login ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

async function loadWorkflow(name) {
  const list = await fetch(`${base}/rest/workflows?limit=250`, {
    headers: { Cookie: cookie },
  }).then((r) => r.json());
  const summary = (list.data || []).find((w) => w.name === name);
  if (!summary) throw new Error(`${name} workflow missing`);
  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie },
  }).then((r) => r.json());
  return detail.data || detail;
}

async function saveWorkflow(wf) {
  const put = await fetch(`${base}/rest/workflows/${wf.id}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings,
      staticData: wf.staticData ?? null,
      active: wf.active,
      ...(wf.versionId ? { versionId: wf.versionId } : {}),
    }),
  });
  if (!put.ok) throw new Error(`patch ${wf.name} ${put.status} ${await put.text()}`);
}

function backup(wf, label) {
  const backupDir = path.join(process.cwd(), "scripts", "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir, `${label}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(wf, null, 1), "utf8");
  console.log("backup", path.relative(process.cwd(), file));
}

const panel = await loadWorkflow("panel-staff");
backup(panel, "panel-staff-nurse-suggest-log");

const mysql71 = panel.nodes.find((n) => n.name === "MySQL71");
if (!mysql71) throw new Error("MySQL71 missing");
mysql71.parameters.query = SUGGEST_LOOKUP_SQL_FINAL;
console.log("updated MySQL71 lookup for suggest log");

const suggestLogName = "HTTP Log Suggest Nurse";
if (!panel.nodes.some((n) => n.name === suggestLogName)) {
  panel.nodes.push(
    logHttpNode({
      id: crypto.randomUUID(),
      name: suggestLogName,
      position: [-2440, 900],
      titleExpr: SUGGEST_TEXT,
    })
  );
  ensureOutgoing(panel.connections, "MySQL71", suggestLogName);
  console.log("added", suggestLogName);
} else {
  const existing = panel.nodes.find((n) => n.name === suggestLogName);
  existing.parameters = logHttpNode({
    id: existing.id,
    name: suggestLogName,
    position: existing.position,
    titleExpr: SUGGEST_TEXT,
  }).parameters;
  ensureOutgoing(panel.connections, "MySQL71", suggestLogName);
  console.log("updated", suggestLogName);
}

await saveWorkflow(panel);
console.log("panel-staff patched");

// --- reservations: select log ---
const reservations = await loadWorkflow("reservations");
backup(reservations, "reservations-nurse-select-log");

const mysqlCred = reservations.nodes.find((n) => n.credentials?.mySql)?.credentials;
if (!mysqlCred?.mySql) throw new Error("reservations MySQL credential missing");

const selectLookupName = "Lookup Nurse Select Log";
const selectLogName = "HTTP Log Select Nurse";

if (!reservations.nodes.some((n) => n.name === selectLookupName)) {
  reservations.nodes.push(
    mysqlLookupNode({
      id: crypto.randomUUID(),
      name: selectLookupName,
      position: [-1860, 320],
      query: SELECT_LOOKUP_SQL,
      credentials: mysqlCred,
    })
  );
  console.log("added", selectLookupName);
} else {
  const n = reservations.nodes.find((x) => x.name === selectLookupName);
  n.parameters.query = SELECT_LOOKUP_SQL;
  console.log("updated", selectLookupName);
}

if (!reservations.nodes.some((n) => n.name === selectLogName)) {
  reservations.nodes.push(
    logHttpNode({
      id: crypto.randomUUID(),
      name: selectLogName,
      position: [-1620, 320],
      titleExpr: SELECT_TEXT,
    })
  );
  console.log("added", selectLogName);
} else {
  const n = reservations.nodes.find((x) => x.name === selectLogName);
  n.parameters = logHttpNode({
    id: n.id,
    name: selectLogName,
    position: n.position,
    titleExpr: SELECT_TEXT,
  }).parameters;
  console.log("updated", selectLogName);
}

ensureOutgoing(reservations.connections, "MySQL10", selectLookupName);
ensureOutgoing(reservations.connections, selectLookupName, selectLogName);

await saveWorkflow(reservations);
console.log("reservations patched");
console.log("done");
