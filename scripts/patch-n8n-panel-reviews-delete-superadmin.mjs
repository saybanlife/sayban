/**
 * Allow super_admin (and center_admin) to delete reviews via panel/reviews/delete.
 *
 *   node scripts/patch-n8n-panel-reviews-delete-superadmin.mjs
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "panel2";

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
const role = String(claims.role || "");
return [{
  json: {
    panel_user_id: Number(claims.id) || 0,
    role,
    review_id: Number(body.review_id) || 0,
    ok: (role === 'center_admin' || role === 'super_admin') && Number(body.review_id) > 0
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
if (!auth.ok) {
  return [{ json: { success: false, message: 'نظر یافت نشد.' } }];
}
const stillExists = items.some(item => item.json && item.json.id != null);
if (stillExists) {
  return [{ json: { success: false, message: 'حذف نظر ناموفق بود.' } }];
}
return [{ json: { success: true, message: 'نظر حذف شد.', deleted_id: auth.review_id } }];
`;

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
    `panel2-reviews-delete-superadmin-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
const auth = byName.panel_reviews_delete_auth;
const reply = byName.panel_reviews_delete_reply;
const review = byName.panel_reviews_delete_review;
const verify = byName.panel_reviews_delete_verify;
const format = byName.panel_reviews_delete_format;
const respond = byName.panel_reviews_delete_respond;
if (!auth || !reply || !review || !verify || !format) {
  throw new Error("delete chain nodes missing; run patch-n8n-panel-reviews-delete.mjs first");
}

auth.parameters.jsCode = AUTH_JS;
reply.parameters.query = DELETE_REPLY_SQL;
review.parameters.query = DELETE_REVIEW_SQL;
verify.parameters.query = VERIFY_SQL;
format.parameters.jsCode = FORMAT_JS;
if (respond) {
  respond.parameters = {
    respondWith: "json",
    responseBody: "={{ JSON.stringify($json) }}",
    options: {}
  };
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}
console.log("panel/reviews/delete now allows super_admin + center_admin");
