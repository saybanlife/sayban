/**
 * Patch sayban2 `/Reservation` list SQL so inactive/completed rows are returned:
 * - stop excluding `rejected`
 * - include lifecycle fields for completed-tab classification
 * - include latest user center rating when available
 *
 *   node scripts/patch-n8n-reservation-list-include-inactive.mjs
 *   node scripts/patch-n8n-reservation-list-include-inactive.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "sayban2";
const NODE_NAME = "MySQL9";
const MARKER = "/* sayban-inactive-list-v1 */";

const NEW_QUERY = `${MARKER}
SELECT
    r.id,
    r.reservation_code,
    MD5(r.center_id) AS center_id,
    c.name AS center_name,
    c.main_image,
    r.service_id,
    s.name AS service_name,
    s.code AS service_code,
    r.user_id,
    r.patient_id,
    r.start_time,
    r.end_time,
    r.final_price,
    r.payment_method,
    r.payment_status,
    r.status,
    r.created_at,
    r.updated_at,
    r.service_location,
    r.staff_id,
    r.user_address_id,
    ua.address AS user_address,
    ua.title AS user_addressTitle,
    ua.city AS user_addressCity,
    rl.stage AS lifecycle_stage,
    rl.trial_decision,
    rl.contract_closed_at,
    rl.cancellation_policy,
    rl.visit_post_visit_meta,
    (SELECT rq.answers
       FROM reservations__questionnaires rq
      WHERE rq.reservation_id = r.id
      LIMIT 1) AS answers,
    (SELECT cr.rating
       FROM centers__reviews cr
      WHERE cr.user_id = r.user_id
        AND (r.center_id IS NULL OR cr.center_id = r.center_id)
      ORDER BY cr.id DESC
      LIMIT 1) AS user_rating
FROM reservations r
LEFT JOIN centers c ON r.center_id = c.id
LEFT JOIN centers__services s ON r.service_id = s.id
LEFT JOIN users__addresses ua ON r.user_address_id = ua.id
LEFT JOIN reservations__lifecycle rl ON rl.reservation_id = r.id
WHERE r.user_id = $1
  AND (
    CASE
        WHEN $4 = 'my_history' THEN (r.patient_id IS NULL OR r.patient_id = '')
        WHEN $4 = 'others_history' THEN (r.patient_id IS NOT NULL AND r.patient_id <> '')
        WHEN $4 = 'current_orders' THEN r.start_time > NOW() AND r.status IN ('confirmed', 'pending')
        WHEN $4 = 'previous_orders' THEN r.start_time <= NOW() OR r.status IN ('completed', 'canceled', 'cancelled', 'rejected', 'refunded')
        ELSE TRUE
    END
)
AND ($2 = '' OR r.start_time >= $2)
AND ($3 = '' OR r.start_time <= $3)
AND r.status IS NOT NULL
ORDER BY r.created_at DESC;`;

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

const backupDir = path.join(
  process.cwd(),
  ".cursor",
  "sayban-ops",
  "backups"
);
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(
  backupDir,
  `${WORKFLOW_NAME}-reservation-list-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupPath, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", backupPath);

const nodes = [...wf.nodes];
const node = nodes.find(n => n.name === NODE_NAME);
if (!node) throw new Error(`node ${NODE_NAME} not found`);

const prevQuery = String(node.parameters?.query || "");
if (revert) {
  if (!prevQuery.includes(MARKER)) {
    console.log("nothing to revert");
    process.exit(0);
  }
  throw new Error(
    "Use the JSON backup to restore MySQL9 manually; auto-revert needs prior query snapshot."
  );
}

if (prevQuery.includes(MARKER)) {
  console.log("already patched");
  process.exit(0);
}

if (!prevQuery.includes("status <> 'rejected'") && !prevQuery.includes('status <> "rejected"')) {
  console.warn(
    "expected rejected exclusion not found; applying additive patch anyway"
  );
}

node.parameters = {
  ...node.parameters,
  query: NEW_QUERY
};

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    active: true
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}
console.log("patched /Reservation list to include inactive statuses + lifecycle");
