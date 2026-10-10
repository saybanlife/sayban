/**
 * Adds the center's reply to the public center reviews query in `sayban2`.
 *
 * `Comment.tsx` renders «پاسخ مرکز» from `admin_reply`, but the public `reviews`
 * node never selected it, so replies written from the panel were invisible to
 * users. Replies live in `centers__reply` (the same table `get/review/` reads),
 * so join it and expose `admin_reply` / `admin_replied_at`.
 *
 *   node scripts/patch-n8n-public-reviews-reply.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "sayban2";
const NODE_NAME = "reviews";

const ORIGINAL_QUERY = `SELECT 
    r.id AS review_id,
    r.center_id,
    r.user_id,
    u.name AS user_name,
    r.rating,
    r.comment,
    r.created_at
FROM centers__reviews r
LEFT JOIN users u
    ON r.user_id = u.id
WHERE r.center_id = $1
ORDER BY r.created_at DESC;
`;

const PATCHED_QUERY = `SELECT 
    r.id AS review_id,
    r.center_id,
    r.user_id,
    u.name AS user_name,
    r.rating,
    r.comment,
    r.created_at,
    p.comment AS admin_reply,
    p.created_at AS admin_replied_at
FROM centers__reviews r
LEFT JOIN users u
    ON r.user_id = u.id
LEFT JOIN centers__reply p
    ON p.review_id = r.id
WHERE r.center_id = $1
ORDER BY r.created_at DESC;
`;

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
const revert = process.argv.includes("--revert");

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
  `${WORKFLOW_NAME}-public-reviews-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const node = nodes.find(n => n.name === NODE_NAME);
if (!node) throw new Error(`node ${NODE_NAME} not found`);

const current = String(node.parameters?.query || "");
const target = revert ? ORIGINAL_QUERY : PATCHED_QUERY;
const expected = revert ? PATCHED_QUERY : ORIGINAL_QUERY;

if (current.trim() === target.trim()) {
  console.log("already in the requested state; nothing to do");
  process.exit(0);
}
if (current.trim() !== expected.trim()) {
  console.error("unexpected current query, refusing to overwrite:\n", current);
  process.exit(1);
}

node.parameters.query = target;

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections: wf.connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

console.log(revert ? "reverted public reviews query" : "public reviews now include admin_reply");
