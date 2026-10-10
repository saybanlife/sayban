/**
 * Fix empty webhook bodies when lifecycle/details Code nodes fail.
 * Throws → n8n responseMode=responseNode returns "" ; UI cannot show message.
 *
 * Changes:
 * - Auth/validate return { success:false, message } instead of throw
 * - IF nodes short-circuit to Respond with that JSON
 * - Respond sets HTTP 4xx when success===false
 *
 *   node scripts/patch-n8n-reservation-lifecycle-error-responses.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "reservations";

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
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

function ifNode(name, position) {
  return {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "loose",
          version: 2
        },
        conditions: [
          {
            id: crypto.randomUUID(),
            leftValue: "={{ Boolean($json.error) || $json.success === false }}",
            rightValue: true,
            operator: {
              type: "boolean",
              operation: "true",
              singleValue: true
            }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position,
    id: crypto.randomUUID(),
    name
  };
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

const backupDir = path.join(process.cwd(), ".cursor", "sayban-ops", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(
  backupDir,
  `${WORKFLOW_NAME}-lifecycle-errors-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupPath, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", backupPath);

const nodes = [...(wf.nodes || [])];
const connections = JSON.parse(JSON.stringify(wf.connections || {}));

const byName = name => nodes.find(n => n.name === name);

for (const [name, js] of [
  ["res_details_auth", DETAILS_AUTH_JS],
  ["res_life_auth", LIFE_AUTH_JS],
  ["res_life_validate", LIFE_VALIDATE_JS]
]) {
  const node = byName(name);
  if (!node) throw new Error(`missing node ${name}`);
  node.parameters = node.parameters || {};
  node.parameters.jsCode = js;
  console.log("updated", name);
}

for (const name of ["res_details_respond", "res_life_respond"]) {
  const node = byName(name);
  if (!node) throw new Error(`missing ${name}`);
  node.parameters = node.parameters || {};
  node.parameters.respondWith = "json";
  node.parameters.responseBody = "={{ JSON.stringify($json) }}";
  node.parameters.options = {
    ...(node.parameters.options || {}),
    responseCode:
      "={{ $json.success === false ? 409 : 200 }}"
  };
  console.log("updated respond codes", name);
}

// Remove prior IF nodes if re-run
const IF_AUTH = "res_life_if_auth";
const IF_VALIDATE = "res_life_if_validate";
const IF_DETAILS = "res_details_if_auth";
for (const name of [IF_AUTH, IF_VALIDATE, IF_DETAILS]) {
  const idx = nodes.findIndex(n => n.name === name);
  if (idx >= 0) nodes.splice(idx, 1);
  delete connections[name];
}

const lifeAuth = byName("res_life_auth");
const lifeValidate = byName("res_life_validate");
const detailsAuth = byName("res_details_auth");
const [ax, ay] = lifeAuth.position || [0, 0];
const [vx, vy] = lifeValidate.position || [ax + 220, ay];
const [dx, dy] = detailsAuth.position || [0, 0];

nodes.push(
  ifNode(IF_DETAILS, [dx + 180, dy - 40]),
  ifNode(IF_AUTH, [ax + 180, ay - 40]),
  ifNode(IF_VALIDATE, [vx + 180, vy - 40])
);

// details: webhook → auth → IF → (error)respond / (ok)select
connections["reservations details"] = {
  main: [[{ node: "res_details_auth", type: "main", index: 0 }]]
};
connections["res_details_auth"] = {
  main: [[{ node: IF_DETAILS, type: "main", index: 0 }]]
};
connections[IF_DETAILS] = {
  main: [
    [{ node: "res_details_respond", type: "main", index: 0 }],
    [{ node: "res_details_select", type: "main", index: 0 }]
  ]
};
connections["res_details_select"] = {
  main: [[{ node: "res_details_format", type: "main", index: 0 }]]
};
connections["res_details_format"] = {
  main: [[{ node: "res_details_respond", type: "main", index: 0 }]]
};

// lifecycle: webhook → auth → IF → (error)respond / (ok)current → validate → IF → ...
connections["reservations lifecycle"] = {
  main: [[{ node: "res_life_auth", type: "main", index: 0 }]]
};
connections["res_life_auth"] = {
  main: [[{ node: IF_AUTH, type: "main", index: 0 }]]
};
connections[IF_AUTH] = {
  main: [
    [{ node: "res_life_respond", type: "main", index: 0 }],
    [{ node: "res_life_current", type: "main", index: 0 }]
  ]
};
connections["res_life_current"] = {
  main: [[{ node: "res_life_validate", type: "main", index: 0 }]]
};
connections["res_life_validate"] = {
  main: [[{ node: IF_VALIDATE, type: "main", index: 0 }]]
};
connections[IF_VALIDATE] = {
  main: [
    [{ node: "res_life_respond", type: "main", index: 0 }],
    [{ node: "res_life_cancel", type: "main", index: 0 }]
  ]
};
connections["res_life_cancel"] = {
  main: [[{ node: "res_life_interview", type: "main", index: 0 }]]
};
connections["res_life_interview"] = {
  main: [[{ node: "res_life_attendance", type: "main", index: 0 }]]
};
connections["res_life_attendance"] = {
  main: [[{ node: "res_life_trial", type: "main", index: 0 }]]
};
connections["res_life_trial"] = {
  main: [[{ node: "res_life_trial_stop", type: "main", index: 0 }]]
};
connections["res_life_trial_stop"] = {
  main: [[{ node: "res_life_close", type: "main", index: 0 }]]
};
connections["res_life_close"] = {
  main: [[{ node: "res_life_select", type: "main", index: 0 }]]
};
connections["res_life_select"] = {
  main: [[{ node: "res_life_format", type: "main", index: 0 }]]
};
connections["res_life_format"] = {
  main: [[{ node: "res_life_respond", type: "main", index: 0 }]]
};

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PUT",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {},
    staticData: wf.staticData,
    active: true
  })
});
if (!patchRes.ok) {
  const patch2 = await fetch(`${base}/rest/workflows/${summary.id}`, {
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
  if (!patch2.ok) {
    throw new Error(
      `patch failed: ${patchRes.status}/${patch2.status} ${await patch2.text()}`
    );
  }
}

// Force webhook re-register
await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ active: false })
});
await new Promise(r => setTimeout(r, 800));
await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ active: true })
});

console.log("patched lifecycle/details error responses + IF short-circuit");
