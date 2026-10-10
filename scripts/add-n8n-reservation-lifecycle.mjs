/**
 * Adds customer reservation details + lifecycle action webhooks to n8n `reservations`:
 *   GET  reservations/details?id=
 *   POST reservations/lifecycle { reservation_id, action, ... }
 *
 * Auth: jwtAuth (same credential as other reservation webhooks).
 * Does not remove or alter existing reservation/payment/steff endpoints.
 *
 *   node scripts/add-n8n-reservation-lifecycle.mjs
 *   node scripts/add-n8n-reservation-lifecycle.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "reservations";
const TEMPLATE_SQL_NODE = "MySQL11";
const TEMPLATE_WEBHOOK_NODE = "reservations2";
const TEMPLATE_CODE_NODE = "Code44";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook8";

const DETAILS_WH = "reservations details";
const LIFE_WH = "reservations lifecycle";

const ADDED_NODES = [
  DETAILS_WH,
  "res_details_auth",
  "res_details_select",
  "res_details_format",
  "res_details_respond",
  LIFE_WH,
  "res_life_auth",
  "res_life_current",
  "res_life_validate",
  "res_life_cancel",
  "res_life_interview",
  "res_life_attendance",
  "res_life_trial",
  "res_life_trial_stop",
  "res_life_close",
  "res_life_select",
  "res_life_format",
  "res_life_respond"
];

const DETAILS_SQL = `SELECT
  r.*,
  c.name AS center_name,
  c.address AS center_address,
  c.city AS center_city,
  c.phone AS center_phone,
  c.latitude AS center_latitude,
  c.longitude AS center_longitude,
  MD5(c.id) AS center_public_id,
  s.name AS service_name,
  s.code AS service_code,
  st.name AS staff_name,
  st.avatar AS staff_avatar,
  st.rating AS staff_rating,
  rl.stage AS lifecycle_stage,
  rl.selected_offer_id,
  rl.interview_options,
  rl.interview_at,
  rl.interview_mode,
  rl.trial_start_at,
  rl.trial_end_at,
  rl.trial_daily_price,
  rl.trial_total_price,
  rl.trial_attendance_user,
  rl.trial_attendance_staff,
  rl.trial_decision,
  rl.contract_deadline,
  rl.contract_closed_at,
  rl.cancellation_policy,
  rl.visit_post_visit_meta,
  o.proposed_slots AS offer_proposed_slots,
  o.proposed_date AS offer_proposed_date,
  o.proposed_time AS offer_proposed_time,
  ua.address AS user_address,
  ua.title AS user_addressTitle,
  ua.city AS user_addressCity,
  (SELECT rq.answers
     FROM reservations__questionnaires rq
    WHERE rq.reservation_id = r.id
    LIMIT 1) AS answers
FROM reservations r
LEFT JOIN centers c ON c.id = r.center_id
LEFT JOIN centers__services s ON s.id = r.service_id
LEFT JOIN centers__staffs st ON st.id = r.staff_id
LEFT JOIN reservations__lifecycle rl ON rl.reservation_id = r.id
LEFT JOIN centers__offers o ON o.id = COALESCE(
  rl.selected_offer_id,
  (
    SELECT o2.id
      FROM centers__offers o2
     WHERE o2.reservation_id = r.id
       AND (r.staff_id IS NULL OR o2.staff_id = r.staff_id)
     ORDER BY o2.id DESC
     LIMIT 1
  )
)
LEFT JOIN users__addresses ua ON ua.id = r.user_address_id
WHERE r.id = $1 AND r.user_id = $2
LIMIT 1;`;

const CURRENT_SQL = `SELECT r.status, r.service_location, rl.stage AS lifecycle_stage,
       rl.interview_options
  FROM reservations r
  LEFT JOIN reservations__lifecycle rl ON rl.reservation_id = r.id
 WHERE r.id = $1 AND r.user_id = $2
 LIMIT 1;`;

const DETAILS_AUTH_JS = `const raw = $input.first().json || {};
const fail = (message) => [{ json: { success: false, result: null, message, error: true } }];
const userId = Number(raw.jwtPayload?.id);
if (!Number.isFinite(userId) || userId <= 0) {
  return fail("کاربر نامعتبر است.");
}
const query = raw.query && typeof raw.query === "object" ? raw.query : {};
const reservationId = Number(query.id ?? query.reservation_id);
if (!Number.isInteger(reservationId) || reservationId <= 0) {
  return fail("شناسه رزرو نامعتبر است.");
}
return [{ json: { reservation_id: reservationId, user_id: userId, error: false } }];
`;

const LIFE_AUTH_JS = `const raw = $input.first().json || {};
const fail = (message) => [{ json: { success: false, result: null, message, error: true } }];
const userId = Number(raw.jwtPayload?.id);
if (!Number.isFinite(userId) || userId <= 0) {
  return fail("کاربر نامعتبر است.");
}
const body = raw.body && typeof raw.body === "object" ? raw.body : {};
const reservationId = Number(body.reservation_id ?? body.id);
if (!Number.isInteger(reservationId) || reservationId <= 0) {
  return fail("شناسه رزرو نامعتبر است.");
}
const action = String(body.action || "").trim();
const allowed = [
  "cancel_request",
  "select_interview",
  "report_attendance",
  "trial_decision",
  "close_contract"
];
if (!allowed.includes(action)) {
  return fail("عملیات نامعتبر است.");
}
return [{
  json: {
    reservation_id: reservationId,
    user_id: userId,
    action,
    interviewAt: body.interviewAt ?? null,
    interviewMode: body.interviewMode ?? null,
    attended: body.attended,
    decision: body.decision ?? null,
    error: false
  }
}];
`;

const LIFE_VALIDATE_JS = `const plan = $("res_life_auth").first().json || {};
const fail = (message) => [{ json: { success: false, result: null, message, error: true } }];
if (plan.error === true) {
  return [{ json: plan }];
}
const rows = $input.all().map(i => i.json).filter(r => r && r.status != null);
const current = rows[0];
if (!current) {
  return fail("رزرو پیدا نشد.");
}

function validDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

const action = plan.action;
const status = String(current.status || "");
const stage = String(current.lifecycle_stage || "");
let interviewAt = null;
let interviewMode = null;
let attended = null;
let decision = null;

if (action === "cancel_request") {
  const ok = [
    "draft",
    "registered",
    "pending",
    "awaitingOffers",
    "awaitingSupport",
    "offersReceived",
    "nurseSelected",
    "awaitingPayment",
    "paymentCompleted",
    "confirmed",
    "finalConfirmed",
    "readyForDispatch"
  ];
  if (!ok.includes(status)) {
    return fail("در این مرحله امکان لغو نیست.");
  }
} else if (action === "select_interview") {
  interviewAt = validDate(plan.interviewAt);
  interviewMode = plan.interviewMode;
  if (!interviewAt || !["online", "home", "center"].includes(String(interviewMode || ""))) {
    return fail("انتخاب وقت مصاحبه نامعتبر است.");
  }
  let options = [];
  try {
    const raw = current.interview_options;
    options = typeof raw === "string" ? JSON.parse(raw || "[]") : (raw || []);
  } catch {
    options = [];
  }
  if (!Array.isArray(options)) options = [];
  const selected = options.find(option => validDate(option?.starts_at) === interviewAt);
  if (!selected || (selected.modes?.length && !selected.modes.includes(interviewMode))) {
    return fail("این وقت مصاحبه در دسترس نیست.");
  }
} else if (action === "report_attendance") {
  if (typeof plan.attended !== "boolean") {
    return fail("وضعیت حضور الزامی است.");
  }
  if (stage !== "trial_in_progress") {
    return fail("در این مرحله نمی‌توان حضور را ثبت کرد.");
  }
  attended = plan.attended ? 1 : 0;
} else if (action === "trial_decision") {
  if (!["continue", "stop"].includes(String(plan.decision || ""))) {
    return fail("تصمیم آزمایشی نامعتبر است.");
  }
  if (stage !== "trial_decision") {
    return fail("در این مرحله تصمیم آزمایشی ممکن نیست.");
  }
  decision = plan.decision;
} else if (action === "close_contract") {
  if (stage !== "awaiting_contract") {
    return fail("در این مرحله بستن قرارداد ممکن نیست.");
  }
}

return [{
  json: {
    reservation_id: plan.reservation_id,
    user_id: plan.user_id,
    action,
    interview_at: interviewAt,
    interview_mode: interviewMode,
    attended,
    decision,
    trial_stage: decision === "continue" ? "awaiting_contract" : "trial_stopped",
    error: false
  }
}];
`;

const FORMAT_JS = `const rows = $input.all()
  .map(item => item.json)
  .filter(row => row && row.id != null);
const row = rows[0] || null;
if (!row) {
  return [{ json: { success: false, result: null, message: "Reservation not found" } }];
}
return [{ json: { success: true, result: row } }];
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
  `${WORKFLOW_NAME}-lifecycle-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupPath, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", backupPath);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

function dropAdded() {
  nodes = nodes.filter(n => !ADDED_NODES.includes(n.name));
  for (const name of ADDED_NODES) delete connections[name];
}

const existingPaths = new Set(
  nodes
    .filter(n => String(n.type || "").includes("webhook"))
    .map(n => String(n.parameters?.path || "").replace(/^\/+/, ""))
);
for (const p of ["reservations/details", "reservations/lifecycle"]) {
  if (!revert && existingPaths.has(p) && !nodes.some(n => ADDED_NODES.includes(n.name))) {
    // path owned by a different node — abort
    const owner = nodes.find(
      n =>
        String(n.type || "").includes("webhook") &&
        String(n.parameters?.path || "").replace(/^\/+/, "") === p
    );
    if (owner && !ADDED_NODES.includes(owner.name)) {
      throw new Error(`webhook path already exists on node ${owner.name}: ${p}`);
    }
  }
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
    throw new Error("template nodes missing on reservations workflow");
  }

  const originX = (webhookTemplate.position?.[0] ?? 0) + 1100;
  const originY = (webhookTemplate.position?.[1] ?? 0) + 420;
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
    position: [originX, originY + row * 260],
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
    position: [originX + col * 220, originY + row * 260],
    id: crypto.randomUUID(),
    name,
    credentials: creds(sqlTemplate)
  });

  const codeNode = (name, jsCode, col, row) => ({
    parameters: { mode: "runOnceForAllItems", jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: codeTemplate.typeVersion,
    position: [originX + col * 220, originY + row * 260],
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
    position: [originX + col * 220, originY + row * 260],
    id: crypto.randomUUID(),
    name
  });

  // One leading `={{` for the whole replacement string (n8n expression), then
  // comma-separated `{{ ... }}` segments — NOT `={{ a }},={{ b }}` which breaks.
  const life = (...fields) =>
    `={{ ${fields
      .map(field => `$('res_life_validate').item.json.${field}`)
      .join(" }},{{ ") } }}`;

  nodes.push(
    webhookNode(DETAILS_WH, "GET", "reservations/details", 0),
    codeNode("res_details_auth", DETAILS_AUTH_JS, 1, 0),
    sqlNode(
      "res_details_select",
      DETAILS_SQL,
      "={{ $json.reservation_id }},{{ $json.user_id }}",
      2,
      0
    ),
    codeNode("res_details_format", FORMAT_JS, 3, 0),
    respondNode("res_details_respond", 4, 0),

    webhookNode(LIFE_WH, "POST", "reservations/lifecycle", 1),
    codeNode("res_life_auth", LIFE_AUTH_JS, 1, 1),
    sqlNode(
      "res_life_current",
      CURRENT_SQL,
      "={{ $json.reservation_id }},{{ $json.user_id }}",
      2,
      1
    ),
    codeNode("res_life_validate", LIFE_VALIDATE_JS, 3, 1),
    sqlNode(
      "res_life_cancel",
      `UPDATE reservations
SET status = 'canceled'
WHERE id = $1 AND user_id = $2
  AND $3 = 'cancel_request'
  AND status IN ('draft','registered','pending','awaitingOffers','awaitingSupport','offersReceived','nurseSelected','awaitingPayment','paymentCompleted','confirmed','finalConfirmed','readyForDispatch');`,
      life("reservation_id", "user_id", "action"),
      4,
      1
    ),
    sqlNode(
      "res_life_interview",
      `INSERT INTO reservations__lifecycle
   (reservation_id, stage, interview_at, interview_mode)
 SELECT $1, 'interview_scheduled', $4, $5
   FROM DUAL
  WHERE $3 = 'select_interview'
 ON DUPLICATE KEY UPDATE
   stage = IF(VALUES(stage) IS NOT NULL, VALUES(stage), stage),
   interview_at = IF(VALUES(interview_at) IS NOT NULL, VALUES(interview_at), interview_at),
   interview_mode = IF(VALUES(interview_mode) IS NOT NULL, VALUES(interview_mode), interview_mode);`,
      life(
        "reservation_id",
        "user_id",
        "action",
        "interview_at",
        "interview_mode"
      ),
      5,
      1
    ),
    sqlNode(
      "res_life_attendance",
      `INSERT INTO reservations__lifecycle
   (reservation_id, stage, trial_attendance_user)
 SELECT $1, 'trial_in_progress', $4
   FROM DUAL
  WHERE $3 = 'report_attendance'
 ON DUPLICATE KEY UPDATE
   stage = IF($3 = 'report_attendance', VALUES(stage), stage),
   trial_attendance_user = IF($3 = 'report_attendance', VALUES(trial_attendance_user), trial_attendance_user);`,
      life("reservation_id", "user_id", "action", "attended"),
      6,
      1
    ),
    sqlNode(
      "res_life_trial",
      `INSERT INTO reservations__lifecycle
   (reservation_id, stage, trial_decision)
 SELECT $1, $4, $5
   FROM DUAL
  WHERE $3 = 'trial_decision'
 ON DUPLICATE KEY UPDATE
   stage = IF($3 = 'trial_decision', VALUES(stage), stage),
   trial_decision = IF($3 = 'trial_decision', VALUES(trial_decision), trial_decision);`,
      life(
        "reservation_id",
        "user_id",
        "action",
        "trial_stage",
        "decision"
      ),
      7,
      1
    ),
    sqlNode(
      "res_life_trial_stop",
      `UPDATE reservations
SET status = 'canceled'
WHERE id = $1 AND user_id = $2
  AND $3 = 'trial_decision'
  AND $4 = 'stop';`,
      life("reservation_id", "user_id", "action", "decision"),
      8,
      1
    ),
    sqlNode(
      "res_life_close",
      `INSERT INTO reservations__lifecycle
   (reservation_id, stage, contract_closed_at)
 SELECT $1, 'contract_closed', UTC_TIMESTAMP()
   FROM DUAL
  WHERE $3 = 'close_contract'
 ON DUPLICATE KEY UPDATE
   stage = IF($3 = 'close_contract', VALUES(stage), stage),
   contract_closed_at = IF($3 = 'close_contract', VALUES(contract_closed_at), contract_closed_at);`,
      life("reservation_id", "user_id", "action"),
      9,
      1
    ),
    sqlNode(
      "res_life_select",
      DETAILS_SQL,
      life("reservation_id", "user_id"),
      10,
      1
    ),
    codeNode("res_life_format", FORMAT_JS, 11, 1),
    respondNode("res_life_respond", 12, 1)
  );

  const wire = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };
  wire(DETAILS_WH, "res_details_auth");
  wire("res_details_auth", "res_details_select");
  wire("res_details_select", "res_details_format");
  wire("res_details_format", "res_details_respond");

  wire(LIFE_WH, "res_life_auth");
  wire("res_life_auth", "res_life_current");
  wire("res_life_current", "res_life_validate");
  wire("res_life_validate", "res_life_cancel");
  wire("res_life_cancel", "res_life_interview");
  wire("res_life_interview", "res_life_attendance");
  wire("res_life_attendance", "res_life_trial");
  wire("res_life_trial", "res_life_trial_stop");
  wire("res_life_trial_stop", "res_life_close");
  wire("res_life_close", "res_life_select");
  wire("res_life_select", "res_life_format");
  wire("res_life_format", "res_life_respond");
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
console.log(
  revert
    ? "reverted reservations details/lifecycle webhooks"
    : "added GET reservations/details + POST reservations/lifecycle"
);
