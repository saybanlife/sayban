/**
 * Align older sendLogToTel texts with the nurse suggest/select log shape:
 * real user (and center, when this step has one) id + name. No hardcoded names.
 *
 *   node scripts/patch-n8n-align-sendlog.mjs
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

const LOG_URL = "https://n7n.staas.ir/webhook/sendLogToTel";

const VISIT_LOOKUP_SQL = `SELECT
  '{{ $('reservations').first().json.jwtPayload.id }}' AS user_id,
  COALESCE((SELECT name FROM users WHERE id = '{{ $('reservations').first().json.jwtPayload.id }}' LIMIT 1), '') AS user_name,
  '{{ $('MySQL1').first().json.id }}' AS center_id,
  COALESCE((SELECT name FROM centers WHERE id = '{{ $('MySQL1').first().json.id }}' LIMIT 1), '') AS center_name`;

const NURSE_REQUEST_LOOKUP_SQL = `SELECT
  '{{ $('Parse Request & Answers').first().json.user_id }}' AS user_id,
  COALESCE((SELECT name FROM users WHERE id = '{{ $('Parse Request & Answers').first().json.user_id }}' LIMIT 1), '') AS user_name`;

const VISIT_TEXT =
  "=رزرو بازدید\nکاربر: {{ $json.user_name }} (شناسه {{ $json.user_id }})\nمرکز: {{ $json.center_name }} (شناسه {{ $json.center_id }})";

const NURSE_REQUEST_TEXT =
  "=درخواست پرستار\nکاربر: {{ $json.user_name }} (شناسه {{ $json.user_id }})";

const GUEST_TEXT =
  "=ورود کاربر\nکاربر: {{ $('/users/guest').item.json.body.name }} (شناسه {{ $('MySQL12').item.json.data.insertId }})";

function setLogText(node, text) {
  if (node.parameters?.url !== LOG_URL) {
    throw new Error(`${node.name} url changed; refusing to edit`);
  }
  const params = node.parameters.bodyParameters?.parameters || [];
  const textParam = params.find((p) => p.name === "text");
  if (!textParam) throw new Error(`${node.name} has no text parameter`);
  textParam.value = text;
}

function mysqlLookupNode({ id, name, position, query, credentials }) {
  return {
    parameters: { operation: "executeQuery", query, options: {} },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position,
    id,
    name,
    credentials,
    onError: "continueRegularOutput",
  };
}

function retarget(connections, from, oldTo, newTo) {
  const groups = connections[from]?.main || [];
  let found = false;
  for (const arr of groups) {
    for (const edge of arr || []) {
      if (edge.node === oldTo) {
        edge.node = newTo;
        found = true;
      }
    }
  }
  if (!found && !groups.some((arr) => (arr || []).some((e) => e.node === newTo))) {
    throw new Error(`edge ${from} -> ${oldTo} not found`);
  }
}

function ensureOutgoing(connections, from, to) {
  if (!connections[from]) connections[from] = { main: [[]] };
  if (!connections[from].main[0]) connections[from].main[0] = [];
  if (!connections[from].main[0].some((e) => e.node === to)) {
    connections[from].main[0].push({ node: to, type: "main", index: 0 });
  }
}

function backup(wf, label) {
  const backupDir = path.join(process.cwd(), "scripts", "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir, `${label}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(wf, null, 1), "utf8");
  console.log("backup", path.relative(process.cwd(), file));
}

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

function upsertLookup(wf, { name, position, query, credentials }) {
  let node = wf.nodes.find((n) => n.name === name);
  if (!node) {
    node = mysqlLookupNode({
      id: crypto.randomUUID(),
      name,
      position,
      query,
      credentials,
    });
    wf.nodes.push(node);
    console.log("added", name);
  } else {
    node.parameters.query = query;
    console.log("updated", name);
  }
  return node;
}

const reservations = await loadWorkflow("reservations");
backup(reservations, "reservations-align-sendlog");
const mysqlCred = reservations.nodes.find((n) => n.credentials?.mySql)?.credentials;
if (!mysqlCred?.mySql) throw new Error("reservations MySQL credential missing");

upsertLookup(reservations, {
  name: "Lookup Visit Log",
  position: [-1000, 40],
  query: VISIT_LOOKUP_SQL,
  credentials: mysqlCred,
});
upsertLookup(reservations, {
  name: "Lookup Nurse Request Log",
  position: [-1000, -1000],
  query: NURSE_REQUEST_LOOKUP_SQL,
  credentials: mysqlCred,
});

const visitLog = reservations.nodes.find((n) => n.name === "HTTP Request2");
const nurseReqLog = reservations.nodes.find((n) => n.name === "HTTP Request4");
if (!visitLog || !nurseReqLog) throw new Error("reservation log nodes missing");
setLogText(visitLog, VISIT_TEXT);
setLogText(nurseReqLog, NURSE_REQUEST_TEXT);

retarget(reservations.connections, "Respond to Webhook2", "HTTP Request2", "Lookup Visit Log");
ensureOutgoing(reservations.connections, "Lookup Visit Log", "HTTP Request2");
retarget(reservations.connections, "Success Response", "HTTP Request4", "Lookup Nurse Request Log");
ensureOutgoing(reservations.connections, "Lookup Nurse Request Log", "HTTP Request4");

await saveWorkflow(reservations);
console.log("reservations aligned");

const users = await loadWorkflow("users");
backup(users, "users-align-sendlog");
const guestLog = users.nodes.find((n) => n.name === "HTTP Request2");
if (!guestLog) throw new Error("users HTTP Request2 missing");
setLogText(guestLog, GUEST_TEXT);
await saveWorkflow(users);
console.log("users aligned");
console.log("done");
