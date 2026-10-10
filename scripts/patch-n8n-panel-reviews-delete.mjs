/**
 * Add POST panel/reviews/delete to workflow `panel2`.
 *
 *   node scripts/patch-n8n-panel-reviews-delete.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel2";
const TEMPLATE_JWT_WEBHOOK = "panel reviews list";
const TEMPLATE_SQL_NODE = "panel_reviews_list_query";
const TEMPLATE_CODE_NODE = "panel_reviews_list_format";
const TEMPLATE_RESPOND_NODE = "panel_reviews_list_respond";

const AUTH_JS = `const input = items[0].json || {};
const auth = String(input.headers?.authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) {
  claims = {};
}
const body = input.body || {};
return [{
  json: {
    panel_user_id: Number(claims.id) || 0,
    role: String(claims.role || ""),
    review_id: Number(body.review_id) || 0
  }
}];`;

const DELETE_REPLY_SQL = `DELETE p FROM centers__reply p
JOIN centers__reviews r ON r.id = p.review_id
JOIN panel__users pu ON pu.id = $1
WHERE r.id = $2
  AND (
    pu.role = 'super_admin'
    OR (pu.role = 'center_admin' AND pu.center_id = r.center_id)
  );`;

const DELETE_REVIEW_SQL = `DELETE r FROM centers__reviews r
JOIN panel__users pu ON pu.id = $1
WHERE r.id = $2
  AND (
    pu.role = 'super_admin'
    OR (pu.role = 'center_admin' AND pu.center_id = r.center_id)
  );`;

const VERIFY_SQL = `SELECT r.id
FROM centers__reviews r
JOIN panel__users pu ON pu.id = $1
WHERE r.id = $2
  AND (
    pu.role = 'super_admin'
    OR (pu.role = 'center_admin' AND pu.center_id = r.center_id)
  )
LIMIT 1;`;

const FORMAT_JS = `const auth = $('panel_reviews_delete_auth').first().json;
if (!auth.panel_user_id || !auth.review_id || (auth.role !== 'center_admin' && auth.role !== 'super_admin')) {
  return [{ json: { success: false, message: 'نظر یافت نشد.' } }];
}
const stillExists = items.some(item => item.json && item.json.id != null);
if (stillExists) {
  return [{ json: { success: false, message: 'حذف نظر ناموفق بود.' } }];
}
return [{ json: { success: true, message: 'نظر حذف شد.', deleted_id: auth.review_id } }];
`;

const CHAIN = {
  webhook: { name: "panel reviews delete", path: "panel/reviews/delete", method: "POST" },
  nodes: [
    { name: "panel_reviews_delete_auth", kind: "code", js: AUTH_JS },
    {
      name: "panel_reviews_delete_reply",
      kind: "sql",
      query: DELETE_REPLY_SQL,
      params: "={{ [$json.panel_user_id, $json.review_id] }}"
    },
    {
      name: "panel_reviews_delete_review",
      kind: "sql",
      query: DELETE_REVIEW_SQL,
      params: "={{ [$('panel_reviews_delete_auth').first().json.panel_user_id, $('panel_reviews_delete_auth').first().json.review_id] }}"
    },
    {
      name: "panel_reviews_delete_verify",
      kind: "sql",
      query: VERIFY_SQL,
      params: "={{ [$('panel_reviews_delete_auth').first().json.panel_user_id, $('panel_reviews_delete_auth').first().json.review_id] }}"
    },
    { name: "panel_reviews_delete_format", kind: "code", js: FORMAT_JS },
    { name: "panel_reviews_delete_respond", kind: "respond" }
  ]
};

const ADDED = [CHAIN.webhook.name, ...CHAIN.nodes.map(n => n.name)];

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
const backupFile = path.join(
  backupDir,
  `${WORKFLOW_NAME}-reviews-delete-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  nodes = nodes.filter(n => !ADDED.includes(n.name));
  for (const name of ADDED) delete connections[name];
} else {
  if (nodes.some(n => ADDED.includes(n.name))) {
    console.log("delete chain already present");
    process.exit(0);
  }

  const webhookTemplate = nodes.find(n => n.name === TEMPLATE_JWT_WEBHOOK);
  const sqlTemplate = nodes.find(n => n.name === TEMPLATE_SQL_NODE);
  const codeTemplate = nodes.find(n => n.name === TEMPLATE_CODE_NODE);
  const respondTemplate = nodes.find(n => n.name === TEMPLATE_RESPOND_NODE);
  for (const [label, node] of [
    [TEMPLATE_JWT_WEBHOOK, webhookTemplate],
    [TEMPLATE_SQL_NODE, sqlTemplate],
    [TEMPLATE_CODE_NODE, codeTemplate],
    [TEMPLATE_RESPOND_NODE, respondTemplate]
  ]) {
    if (!node) throw new Error(`template node ${label} not found`);
  }

  const ref = webhookTemplate.position || [0, 0];
  const baseX = ref[0] - 400;
  const baseY = ref[1] + 880;

  nodes.push({
    parameters: {
      httpMethod: "POST",
      path: CHAIN.webhook.path,
      authentication: "jwtAuth",
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: webhookTemplate.typeVersion,
    position: [baseX, baseY],
    id: crypto.randomUUID(),
    name: CHAIN.webhook.name,
    webhookId: crypto.randomUUID(),
    credentials: JSON.parse(JSON.stringify(webhookTemplate.credentials || {}))
  });

  CHAIN.nodes.forEach((spec, i) => {
    const position = [baseX + 220 * (i + 1), baseY];
    if (spec.kind === "code") {
      nodes.push({
        parameters: { jsCode: spec.js },
        type: "n8n-nodes-base.code",
        typeVersion: codeTemplate.typeVersion,
        position,
        id: crypto.randomUUID(),
        name: spec.name
      });
    } else if (spec.kind === "sql") {
      nodes.push({
        parameters: {
          operation: "executeQuery",
          query: spec.query,
          options: { queryReplacement: spec.params }
        },
        type: "n8n-nodes-base.mySql",
        typeVersion: sqlTemplate.typeVersion,
        position,
        id: crypto.randomUUID(),
        name: spec.name,
        alwaysOutputData: true,
        credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
      });
    } else {
      nodes.push({
        parameters: {
          respondWith: "json",
          responseBody: "={{ JSON.stringify($json) }}",
          options: {}
        },
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: respondTemplate.typeVersion,
        position,
        id: crypto.randomUUID(),
        name: spec.name
      });
    }
  });

  const order = [CHAIN.webhook.name, ...CHAIN.nodes.map(n => n.name)];
  for (let i = 0; i < order.length - 1; i += 1) {
    connections[order[i]] = {
      main: [[{ node: order[i + 1], type: "main", index: 0 }]]
    };
  }
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

console.log(
  revert
    ? "reverted panel/reviews/delete"
    : "added POST panel/reviews/delete"
);
