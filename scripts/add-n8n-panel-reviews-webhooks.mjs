/**
 * Adds the panel reviews management webhooks to the n8n `panel2` workflow:
 *   GET  panel/reviews                  -> list the caller's centre reviews + replies
 *   POST panel/reviews/reply            -> { review_id, comment } upsert a reply
 *   POST panel/reviews/clear-reply      -> { review_id } remove a reply
 *
 * Replaces the Next.js BFF route `/api/panel/reviews`, which required direct
 * MySQL access (`SAYBAN_MYSQL_*`) from the app server. Those vars are unset, and
 * direct MySQL TCP is denied for sayban_db from public client IPs, so the route
 * answered 503 on every call. It also wrote replies to
 * `centers__reviews.admin_reply*`, which nothing else reads — replies now live in
 * `centers__reply`, the table the public centre page already renders.
 *
 * Security: the centre is never taken from the request. Every statement joins
 * `panel__users` on the id inside the (n8n-verified) JWT and requires
 * role = 'center_admin', so a caller can only ever reach their own centre's rows.
 *
 *   node scripts/add-n8n-panel-reviews-webhooks.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel2";
const TEMPLATE_JWT_WEBHOOK = "get/review/";
const TEMPLATE_SQL_NODE = "MySQL16";
const TEMPLATE_CODE_NODE = "Code13";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook57";

/** Reused review projection: one row per review, reply joined from centers__reply. */
const REVIEW_COLUMNS = `r.id, r.center_id, r.user_id, r.rating, r.comment, r.created_at,
       u.name AS user_name, u.mobile AS user_mobile,
       p.id AS reply_id, p.comment AS admin_reply,
       p.created_at AS admin_replied_at, p.user_id AS admin_replied_by`;

const LIST_SQL = `SELECT ${REVIEW_COLUMNS}
FROM panel__users pu
JOIN centers__reviews r ON r.center_id = pu.center_id
LEFT JOIN users u ON u.id = r.user_id
LEFT JOIN centers__reply p ON p.review_id = r.id
WHERE pu.id = $1
  AND pu.role = 'center_admin'
  AND r.comment IS NOT NULL
  AND TRIM(r.comment) <> ''
ORDER BY r.created_at DESC, r.id DESC;`;

const READ_ONE_SQL = `SELECT ${REVIEW_COLUMNS}
FROM panel__users pu
JOIN centers__reviews r ON r.center_id = pu.center_id
LEFT JOIN users u ON u.id = r.user_id
LEFT JOIN centers__reply p ON p.review_id = r.id
WHERE pu.id = $1
  AND pu.role = 'center_admin'
  AND r.id = $2
LIMIT 1;`;

/** Scoped delete: only removes a reply on a review owned by the caller's centre. */
const DELETE_SQL = `DELETE p FROM centers__reply p
JOIN centers__reviews r ON r.id = p.review_id
JOIN panel__users pu
  ON pu.id = $1 AND pu.role = 'center_admin' AND pu.center_id = r.center_id
WHERE p.review_id = $2;`;

/** Scoped insert: the SELECT yields no row (so nothing is written) unless the
 *  caller is a center_admin of the review's centre. */
const INSERT_SQL = `INSERT INTO centers__reply (center_id, user_id, review_id, comment, created_at)
SELECT r.center_id, pu.id, r.id, $3, NOW()
FROM centers__reviews r
JOIN panel__users pu
  ON pu.id = $1 AND pu.role = 'center_admin' AND pu.center_id = r.center_id
WHERE r.id = $2
LIMIT 1;`;

/**
 * n8n verifies the JWT signature on the webhook, so decoding the payload here
 * only reads claims it has already validated.
 */
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
const query = input.query || {};
const repliedRaw = String(query.replied || "all");

return [
  {
    json: {
      panel_user_id: Number(claims.id) || 0,
      role: String(claims.role || ""),
      q: String(query.q || ""),
      replied: repliedRaw === "yes" || repliedRaw === "no" ? repliedRaw : "all",
      review_id: Number(body.review_id) || 0,
      comment: String(body.comment ?? body.reply ?? "")
    }
  }
];
`;

const MAP_HELPER = `function mapRow(row) {
  const reply = row.admin_reply != null ? String(row.admin_reply) : null;
  const hasReply = Boolean(reply && reply.trim());
  return {
    id: Number(row.id),
    center_id: Number(row.center_id),
    user_id: row.user_id != null ? Number(row.user_id) : null,
    rating: row.rating != null ? Number(row.rating) : null,
    comment: row.comment != null ? String(row.comment) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    admin_reply: hasReply ? reply : null,
    admin_replied_at: row.admin_replied_at ? String(row.admin_replied_at) : null,
    admin_replied_by:
      row.admin_replied_by != null ? Number(row.admin_replied_by) : null,
    user_name: row.user_name != null ? String(row.user_name) : null,
    user_mobile: row.user_mobile != null ? String(row.user_mobile) : null,
    has_reply: hasReply
  };
}
`;

const LIST_FORMAT_JS = `${MAP_HELPER}
const auth = $('panel_reviews_auth').first().json;
const q = String(auth.q || "").trim().toLowerCase();
const replied = auth.replied;

const rows = items
  .map(item => item.json)
  .filter(row => row && row.id != null)
  .map(mapRow);

const filtered = rows.filter(row => {
  if (replied === "yes" && !row.has_reply) return false;
  if (replied === "no" && row.has_reply) return false;
  if (!q) return true;
  const haystack = [row.comment, row.user_name, row.user_mobile, row.admin_reply]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
});

return [
  {
    json: {
      success: true,
      result: filtered,
      center_id: rows.length ? rows[0].center_id : null
    }
  }
];
`;

const ONE_FORMAT_JS = `${MAP_HELPER}
const row = items.map(item => item.json).find(r => r && r.id != null);
if (!row) {
  return [{ json: { success: false, message: "نظر یافت نشد." } }];
}
return [{ json: { success: true, result: mapRow(row) } }];
`;

/** name -> node factory args, wired in order per chain. */
const CHAINS = [
  {
    key: "list",
    webhook: { name: "panel reviews list", path: "panel/reviews", method: "GET" },
    nodes: [
      { name: "panel_reviews_auth", kind: "code", js: AUTH_JS },
      {
        name: "panel_reviews_list_query",
        kind: "sql",
        query: LIST_SQL,
        params: "={{ $json.panel_user_id.toString() }}"
      },
      { name: "panel_reviews_list_format", kind: "code", js: LIST_FORMAT_JS },
      { name: "panel_reviews_list_respond", kind: "respond" }
    ]
  },
  {
    key: "reply",
    webhook: {
      name: "panel reviews reply",
      path: "panel/reviews/reply",
      method: "POST"
    },
    nodes: [
      { name: "panel_reviews_reply_auth", kind: "code", js: AUTH_JS },
      {
        name: "panel_reviews_reply_delete",
        kind: "sql",
        query: DELETE_SQL,
        params:
          "={{ [$json.panel_user_id, $json.review_id] }}"
      },
      {
        name: "panel_reviews_reply_insert",
        kind: "sql",
        query: INSERT_SQL,
        // Array form keeps the comment intact; a comma inside the text would
        // otherwise be treated as a parameter separator.
        params:
          "={{ [$('panel_reviews_reply_auth').first().json.panel_user_id, $('panel_reviews_reply_auth').first().json.review_id, $('panel_reviews_reply_auth').first().json.comment] }}"
      },
      {
        name: "panel_reviews_reply_read",
        kind: "sql",
        query: READ_ONE_SQL,
        params:
          "={{ [$('panel_reviews_reply_auth').first().json.panel_user_id, $('panel_reviews_reply_auth').first().json.review_id] }}"
      },
      { name: "panel_reviews_reply_format", kind: "code", js: ONE_FORMAT_JS },
      { name: "panel_reviews_reply_respond", kind: "respond" }
    ]
  },
  {
    key: "clear",
    webhook: {
      name: "panel reviews clear",
      path: "panel/reviews/clear-reply",
      method: "POST"
    },
    nodes: [
      { name: "panel_reviews_clear_auth", kind: "code", js: AUTH_JS },
      {
        name: "panel_reviews_clear_delete",
        kind: "sql",
        query: DELETE_SQL,
        params: "={{ [$json.panel_user_id, $json.review_id] }}"
      },
      {
        name: "panel_reviews_clear_read",
        kind: "sql",
        query: READ_ONE_SQL,
        params:
          "={{ [$('panel_reviews_clear_auth').first().json.panel_user_id, $('panel_reviews_clear_auth').first().json.review_id] }}"
      },
      { name: "panel_reviews_clear_format", kind: "code", js: ONE_FORMAT_JS },
      { name: "panel_reviews_clear_respond", kind: "respond" }
    ]
  }
];

const ADDED_NODES = CHAINS.flatMap(chain => [
  chain.webhook.name,
  ...chain.nodes.map(n => n.name)
]);

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
  `${WORKFLOW_NAME}-reviews-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  nodes = nodes.filter(n => !ADDED_NODES.includes(n.name));
  for (const name of ADDED_NODES) delete connections[name];
} else {
  const existing = nodes.filter(n => ADDED_NODES.includes(n.name));
  if (existing.length) {
    console.log(
      `nodes already present (${existing.length}); re-run with --revert first`
    );
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

  const baseX = (webhookTemplate.position?.[0] ?? 0) - 400;
  const baseY = (webhookTemplate.position?.[1] ?? 0) + 600;

  CHAINS.forEach((chain, chainIndex) => {
    const y = baseY + chainIndex * 220;

    nodes.push({
      parameters: {
        ...(chain.webhook.method === "POST" ? { httpMethod: "POST" } : {}),
        path: chain.webhook.path,
        authentication: "jwtAuth",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: webhookTemplate.typeVersion,
      position: [baseX, y],
      id: crypto.randomUUID(),
      name: chain.webhook.name,
      webhookId: crypto.randomUUID(),
      credentials: JSON.parse(JSON.stringify(webhookTemplate.credentials || {}))
    });

    chain.nodes.forEach((spec, i) => {
      const position = [baseX + 220 * (i + 1), y];
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
          // Empty result sets must still emit an item, otherwise the chain
          // stops before the Respond node and the caller waits for a timeout.
          alwaysOutputData: true,
          credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
        });
      } else {
        nodes.push({
          parameters: { options: {} },
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: respondTemplate.typeVersion,
          position,
          id: crypto.randomUUID(),
          name: spec.name
        });
      }
    });

    const order = [chain.webhook.name, ...chain.nodes.map(n => n.name)];
    for (let i = 0; i < order.length - 1; i += 1) {
      connections[order[i]] = {
        main: [[{ node: order[i + 1], type: "main", index: 0 }]]
      };
    }
  });
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
    ? "reverted panel reviews webhooks"
    : "added GET panel/reviews, POST panel/reviews/reply, POST panel/reviews/clear-reply"
);
