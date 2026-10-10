/**
 * Adds elderly-status get/update webhooks to n8n `users` workflow.
 *
 *   GET  elderly-status?for_user_id=
 *   POST elderly-status/update { for_user_id?, answers: [{question_id, answer}] }
 *
 *   node scripts/patch-n8n-elderly-status.mjs
 *   node scripts/patch-n8n-elderly-status.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "users";
const revert = process.argv.includes("--revert");

const GET_WH = "elderly-status get";
const SAVE_WH = "elderly-status update";

const ADDED = [
  GET_WH,
  "elderly_status_auth",
  "elderly_status_select",
  "elderly_status_format",
  "elderly_status_respond",
  SAVE_WH,
  "elderly_status_save_auth",
  "elderly_status_save_sql",
  "elderly_status_save_apply",
  "elderly_status_upsert",
  "elderly_status_save_format",
  "elderly_status_save_respond"
];

const AUTH_GET_JS = `const raw = $input.first().json || {};
const jwtUserId = Number(raw.jwtPayload?.id);
if (!Number.isFinite(jwtUserId) || jwtUserId <= 0) {
  throw new Error("کاربر نامعتبر است.");
}
const query = raw.query && typeof raw.query === "object" ? raw.query : {};
let forUserId = Number(query.for_user_id);
if (!Number.isFinite(forUserId) || forUserId <= 0) forUserId = jwtUserId;
return [{ json: { jwt_user_id: jwtUserId, for_user_id: forUserId } }];
`;

const AUTH_SAVE_JS = `const raw = $input.first().json || {};
const jwtUserId = Number(raw.jwtPayload?.id);
if (!Number.isFinite(jwtUserId) || jwtUserId <= 0) {
  throw new Error("کاربر نامعتبر است.");
}
const body = raw.body && typeof raw.body === "object" ? raw.body : {};
let forUserId = Number(body.for_user_id);
if (!Number.isFinite(forUserId) || forUserId <= 0) forUserId = jwtUserId;
const answers = Array.isArray(body.answers) ? body.answers : [];
const normalized = [];
for (const row of answers) {
  const questionId = Number(row?.question_id);
  if (!Number.isFinite(questionId) || questionId <= 0) continue;
  let answer = row?.answer;
  if (answer == null) answer = "";
  if (typeof answer !== "string") {
    try { answer = JSON.stringify(answer); } catch { answer = String(answer); }
  }
  normalized.push({ question_id: questionId, answer: String(answer).slice(0, 20000) });
}
return [{
  json: {
    jwt_user_id: jwtUserId,
    for_user_id: forUserId,
    answers: normalized
  }
}];
`;

const SELECT_SQL = `SELECT q.question_id, q.answer
FROM users__elderly_status q
WHERE q.user_id = $1
  AND (
    $1 = $2
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = $1 AND u.parent_user_id = $2
    )
  );`;

const SAVE_SQL = `SELECT
  CASE
    WHEN $1 = $2 THEN 1
    WHEN EXISTS (
      SELECT 1 FROM users u WHERE u.id = $1 AND u.parent_user_id = $2
    ) THEN 1
    ELSE 0
  END AS allowed;`;

const FORMAT_GET_JS = `const rows = $input.all()
  .map(item => item.json)
  .filter(row => row && row.question_id != null)
  .map(row => ({
    question_id: Number(row.question_id),
    answer: row.answer
  }));
return [{ json: { success: true, result: rows } }];
`;

const SAVE_APPLY_JS = `const auth = $("elderly_status_save_auth").first().json || {};
const gate = $input.first().json || {};
if (Number(gate.allowed) !== 1) {
  throw new Error("دسترسی به این کاربر مجاز نیست.");
}
const forUserId = Number(auth.for_user_id);
const answers = Array.isArray(auth.answers) ? auth.answers : [];
if (!answers.length) {
  return [{ json: { user_id: forUserId, question_id: 0, answer: "" } }];
}
return answers.map(row => ({
  json: {
    user_id: forUserId,
    question_id: Number(row.question_id),
    answer: String(row.answer ?? "")
  }
}));
`;

const UPSERT_SQL = `INSERT INTO users__elderly_status (user_id, question_id, answer)
SELECT $1, $2, $3 FROM DUAL WHERE $2 > 0
ON DUPLICATE KEY UPDATE
  answer = VALUES(answer),
  updated_at = CURRENT_TIMESTAMP;`;

const SAVE_FORMAT_JS = `return [{ json: { success: true, message: "وضعیت سالمند ذخیره شد." } }];`;

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(
        path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env"),
        "utf8"
      )
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
  );
}

const env = readEnv();
const base = String(env.N8N_URL || "").replace(/\/$/, "");
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
const summary = (list.data || []).find(item => item.name === WORKFLOW_NAME);
if (!summary) throw new Error("users workflow not found");
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const workflow = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `users-elderly-status-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 2), "utf8");
console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

const nodes = structuredClone(workflow.nodes);
const connections = structuredClone(workflow.connections || {});

const sqlTemplate = nodes.find(node => node.name === "MySQL11");
const webhookTemplate = nodes.find(node => node.name === "add/address3");
const codeTemplate = nodes.find(node => node.name === "Code5");
const respondTemplate = nodes.find(node => node.name === "Respond to Webhook10");
if (!sqlTemplate || !webhookTemplate || !codeTemplate || !respondTemplate) {
  throw new Error("template nodes missing in users workflow");
}

for (const name of ADDED) {
  const index = nodes.findIndex(node => node.name === name);
  if (index >= 0) nodes.splice(index, 1);
  delete connections[name];
}
for (const [from, outs] of Object.entries(connections)) {
  if (!outs?.main) continue;
  outs.main = outs.main.map(branch =>
    (branch || []).filter(link => !ADDED.includes(link.node))
  );
}

if (!revert) {
  const creds = sqlTemplate.credentials;
  const originX = 2400;
  const originY = 1400;

  const webhookNode = (name, method, pathName, row) => ({
    parameters: {
      httpMethod: method,
      path: pathName,
      authentication: "jwtAuth",
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: webhookTemplate.typeVersion,
    position: [originX, originY + row * 260],
    id: crypto.randomUUID(),
    name,
    webhookId: crypto.randomUUID()
  });

  const codeNode = (name, jsCode, col, row) => ({
    parameters: { mode: "runOnceForAllItems", jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: codeTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 260],
    id: crypto.randomUUID(),
    name
  });

  const sqlNode = (name, query, replacement, col, row) => ({
    parameters: {
      operation: "executeQuery",
      query,
      options: { queryReplacement: replacement }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: sqlTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 260],
    id: crypto.randomUUID(),
    name,
    credentials: creds
  });

  const respondNode = (name, col, row) => ({
    parameters: {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json) }}",
      options: {}
    },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: respondTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 260],
    id: crypto.randomUUID(),
    name
  });

  nodes.push(
    webhookNode(GET_WH, "GET", "elderly-status", 0),
    codeNode("elderly_status_auth", AUTH_GET_JS, 1, 0),
    sqlNode(
      "elderly_status_select",
      SELECT_SQL,
      "={{ $json.for_user_id }},{{ $json.jwt_user_id }}",
      2,
      0
    ),
    codeNode("elderly_status_format", FORMAT_GET_JS, 3, 0),
    respondNode("elderly_status_respond", 4, 0),

    webhookNode(SAVE_WH, "POST", "elderly-status/update", 1),
    codeNode("elderly_status_save_auth", AUTH_SAVE_JS, 1, 1),
    sqlNode(
      "elderly_status_save_sql",
      SAVE_SQL,
      "={{ $json.for_user_id }},{{ $json.jwt_user_id }}",
      2,
      1
    ),
    codeNode("elderly_status_save_apply", SAVE_APPLY_JS, 3, 1),
    sqlNode(
      "elderly_status_upsert",
      UPSERT_SQL,
      "={{ $json.user_id }},{{ $json.question_id }},{{ $json.answer }}",
      4,
      1
    ),
    codeNode("elderly_status_save_format", SAVE_FORMAT_JS, 5, 1),
    respondNode("elderly_status_save_respond", 6, 1)
  );

  const link = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };
  link(GET_WH, "elderly_status_auth");
  link("elderly_status_auth", "elderly_status_select");
  link("elderly_status_select", "elderly_status_format");
  link("elderly_status_format", "elderly_status_respond");

  link(SAVE_WH, "elderly_status_save_auth");
  link("elderly_status_save_auth", "elderly_status_save_sql");
  link("elderly_status_save_sql", "elderly_status_save_apply");
  link("elderly_status_save_apply", "elderly_status_upsert");
  link("elderly_status_upsert", "elderly_status_save_format");
  link("elderly_status_save_format", "elderly_status_save_respond");
}

const patch = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: workflow.name,
    nodes,
    connections,
    settings: workflow.settings || {},
    staticData: workflow.staticData
  })
});
if (!patch.ok) {
  throw new Error(`patch failed: ${patch.status} ${await patch.text()}`);
}
console.log(revert ? "reverted elderly-status webhooks" : "patched elderly-status webhooks");
