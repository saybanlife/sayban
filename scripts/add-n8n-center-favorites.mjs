/**
 * Adds favorite-center webhooks to the n8n `users` workflow (jwtAuth):
 *   GET  favorites              → center cards for the signed-in user
 *   GET  favorites/status?center_id=
 *   POST favorites/toggle { center_id }
 *
 * Depends on users__center_favorites (scripts/sql/users_center_favorites.sql).
 *
 *   node scripts/add-n8n-center-favorites.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "users";
const TEMPLATE_SQL_NODE = "MySQL11";
const TEMPLATE_WEBHOOK_NODE = "add/address3";
const TEMPLATE_CODE_NODE = "Code5";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook10";

const LIST_WH = "favorites list";
const STATUS_WH = "favorites status";
const TOGGLE_WH = "favorites toggle";

const ADDED_NODES = [
  LIST_WH,
  "favorites_list_select",
  "favorites_list_format",
  "favorites_list_respond",
  STATUS_WH,
  "favorites_status_select",
  "favorites_status_format",
  "favorites_status_respond",
  TOGGLE_WH,
  "favorites_toggle_select",
  "favorites_toggle_decide",
  "favorites_toggle_if",
  "favorites_toggle_delete",
  "favorites_toggle_insert",
  "favorites_toggle_off",
  "favorites_toggle_on",
  "favorites_toggle_respond_off",
  "favorites_toggle_respond_on"
];

const LIST_SQL = `SELECT c.id, c.name, c.main_image, c.rating_avg, c.address,
       c.center_type, c.city, c.area, c.is_active AS status
FROM users__center_favorites f
INNER JOIN centers c ON c.id = f.center_id
WHERE f.user_id = $1
  AND c.deleted_at IS NULL
ORDER BY f.id DESC;`;

const STATUS_SQL = `SELECT id
FROM users__center_favorites
WHERE user_id = $1 AND center_id = $2
LIMIT 1;`;

const LIST_FORMAT = `const rows = $input.all()
  .map(item => item.json)
  .filter(row => row && row.id != null);
return [{ json: { success: true, result: rows } }];`;

const STATUS_FORMAT = `const rows = $input.all()
  .map(item => item.json)
  .filter(row => row && row.id != null);
return [{ json: { success: true, favorited: rows.length > 0 } }];`;

const DECIDE_JS = `const raw = $("${TOGGLE_WH}").first().json || {};
const body = raw.body && typeof raw.body === "object" ? raw.body : {};
const query = raw.query && typeof raw.query === "object" ? raw.query : {};
const centerRaw = body.center_id ?? query.center_id;
const centerId = Number(centerRaw);
const userId = Number(raw.jwtPayload?.id);
if (!Number.isFinite(userId) || userId <= 0) {
  throw new Error("کاربر نامعتبر است.");
}
if (!Number.isFinite(centerId) || centerId <= 0 || !String(centerRaw || "").match(/^\\d+$/)) {
  throw new Error("center_id نامعتبر است.");
}
const rows = $input.all()
  .map(item => item.json)
  .filter(row => row && row.id != null);
return [{
  json: {
    exists: rows.length > 0,
    user_id: userId,
    center_id: centerId
  }
}];`;

const FORMAT_OFF = `return [{ json: { success: true, favorited: false } }];`;
const FORMAT_ON = `return [{ json: { success: true, favorited: true } }];`;

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

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const revert = process.argv.includes("--revert");

const loginRes = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!loginRes.ok) throw new Error(`n8n login failed: ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === WORKFLOW_NAME);
if (!summary) throw new Error(`workflow ${WORKFLOW_NAME} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `${WORKFLOW_NAME}-favorites-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

function dropAdded() {
  nodes = nodes.filter(n => !ADDED_NODES.includes(n.name));
  for (const name of ADDED_NODES) delete connections[name];
}

if (revert) {
  dropAdded();
} else {
  dropAdded();

  const sqlTemplate = nodes.find(n => n.name === TEMPLATE_SQL_NODE);
  const webhookTemplate = nodes.find(n => n.name === TEMPLATE_WEBHOOK_NODE);
  const codeTemplate = nodes.find(n => n.name === TEMPLATE_CODE_NODE);
  const respondTemplate = nodes.find(n => n.name === TEMPLATE_RESPOND_NODE);
  if (!sqlTemplate || !webhookTemplate || !codeTemplate || !respondTemplate) {
    throw new Error("template nodes missing on users workflow");
  }

  const originX = (webhookTemplate.position?.[0] ?? 0) + 900;
  const originY = (webhookTemplate.position?.[1] ?? 0) + 200;
  const creds = node =>
    node.credentials ? JSON.parse(JSON.stringify(node.credentials)) : undefined;

  const webhookNode = (name, httpMethod, pathName, row) => ({
    parameters: {
      httpMethod,
      path: pathName,
      authentication: "jwtAuth",
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: webhookTemplate.typeVersion,
    position: [originX, originY + row * 220],
    id: crypto.randomUUID(),
    name,
    webhookId: crypto.randomUUID(),
    credentials: creds(webhookTemplate)
  });

  const sqlNode = (name, query, queryReplacement, col, row) => ({
    parameters: {
      operation: "executeQuery",
      query,
      options: { queryReplacement }
    },
    alwaysOutputData: true,
    type: "n8n-nodes-base.mySql",
    typeVersion: sqlTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 220],
    id: crypto.randomUUID(),
    name,
    credentials: creds(sqlTemplate)
  });

  const codeNode = (name, jsCode, col, row) => ({
    parameters: { mode: "runOnceForAllItems", jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: codeTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 220],
    id: crypto.randomUUID(),
    name
  });

  const respondNode = (name, col, row) => ({
    parameters: {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json) }}",
      options: {}
    },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: respondTemplate.typeVersion,
    position: [originX + col * 240, originY + row * 220],
    id: crypto.randomUUID(),
    name
  });

  const jwt = node =>
    `{{ $('${node}').item.json.jwtPayload.id.toString() }}`;

  nodes.push(
    webhookNode(LIST_WH, "GET", "favorites", 0),
    sqlNode("favorites_list_select", LIST_SQL, `=${jwt(LIST_WH)}`, 1, 0),
    codeNode("favorites_list_format", LIST_FORMAT, 2, 0),
    respondNode("favorites_list_respond", 3, 0),

    webhookNode(STATUS_WH, "GET", "favorites/status", 1),
    sqlNode(
      "favorites_status_select",
      STATUS_SQL,
      `=${jwt(STATUS_WH)},{{ $('${STATUS_WH}').item.json.query.center_id }}`,
      1,
      1
    ),
    codeNode("favorites_status_format", STATUS_FORMAT, 2, 1),
    respondNode("favorites_status_respond", 3, 1),

    webhookNode(TOGGLE_WH, "POST", "favorites/toggle", 2),
    sqlNode(
      "favorites_toggle_select",
      STATUS_SQL,
      `=${jwt(TOGGLE_WH)},{{ $('${TOGGLE_WH}').item.json.body.center_id }}`,
      1,
      2
    ),
    codeNode("favorites_toggle_decide", DECIDE_JS, 2, 2),
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "loose"
          },
          conditions: [
            {
              id: crypto.randomUUID(),
              leftValue: "={{ $json.exists }}",
              rightValue: true,
              operator: { type: "boolean", operation: "true" }
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [originX + 3 * 240, originY + 2 * 220],
      id: crypto.randomUUID(),
      name: "favorites_toggle_if"
    },
    sqlNode(
      "favorites_toggle_delete",
      "DELETE FROM users__center_favorites WHERE user_id = $1 AND center_id = $2;",
      "={{ $json.user_id }},{{ $json.center_id }}",
      4,
      2
    ),
    sqlNode(
      "favorites_toggle_insert",
      "INSERT INTO users__center_favorites (user_id, center_id) VALUES ($1, $2);",
      "={{ $json.user_id }},{{ $json.center_id }}",
      4,
      3
    ),
    codeNode("favorites_toggle_off", FORMAT_OFF, 5, 2),
    codeNode("favorites_toggle_on", FORMAT_ON, 5, 3),
    respondNode("favorites_toggle_respond_off", 6, 2),
    respondNode("favorites_toggle_respond_on", 6, 3)
  );

  const wire = (from, to, output = 0) => {
    const current = connections[from] || { main: [] };
    const main = current.main || [];
    while (main.length <= output) main.push([]);
    main[output] = [{ node: to, type: "main", index: 0 }];
    connections[from] = { main };
  };

  wire(LIST_WH, "favorites_list_select");
  wire("favorites_list_select", "favorites_list_format");
  wire("favorites_list_format", "favorites_list_respond");

  wire(STATUS_WH, "favorites_status_select");
  wire("favorites_status_select", "favorites_status_format");
  wire("favorites_status_format", "favorites_status_respond");

  wire(TOGGLE_WH, "favorites_toggle_select");
  wire("favorites_toggle_select", "favorites_toggle_decide");
  wire("favorites_toggle_decide", "favorites_toggle_if");
  wire("favorites_toggle_if", "favorites_toggle_delete", 0);
  wire("favorites_toggle_if", "favorites_toggle_insert", 1);
  wire("favorites_toggle_delete", "favorites_toggle_off");
  wire("favorites_toggle_insert", "favorites_toggle_on");
  wire("favorites_toggle_off", "favorites_toggle_respond_off");
  wire("favorites_toggle_on", "favorites_toggle_respond_on");
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {},
    active: true
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}
console.log(revert ? "favorites webhooks removed" : "favorites webhooks added");
