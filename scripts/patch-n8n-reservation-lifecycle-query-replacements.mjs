/**
 * Fix broken MySQL queryReplacement on reservation lifecycle nodes.
 * Bug: each param was wrapped as `={{ expr }}` joined by commas → `={{ a }},={{ b }}`
 * which breaks n8n expression parsing and aborts the chain before respond.
 *
 * Correct (same as details select): `={{ a }},{{ b }},{{ c }}`
 *
 *   node scripts/patch-n8n-reservation-lifecycle-query-replacements.mjs
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "reservations";

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

function life(...fields) {
  const parts = fields.map(
    field => `$('res_life_validate').item.json.${field}`
  );
  return `={{ ${parts.join(" }},{{ ") } }}`;
}

const REPLACEMENTS = {
  res_life_cancel: life("reservation_id", "user_id", "action"),
  res_life_interview: life(
    "reservation_id",
    "user_id",
    "action",
    "interview_at",
    "interview_mode"
  ),
  res_life_attendance: life("reservation_id", "user_id", "action", "attended"),
  res_life_trial: life(
    "reservation_id",
    "user_id",
    "action",
    "trial_stage",
    "decision"
  ),
  res_life_trial_stop: life("reservation_id", "user_id", "action", "decision"),
  res_life_close: life("reservation_id", "user_id", "action"),
  res_life_select: life("reservation_id", "user_id")
};

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
  `${WORKFLOW_NAME}-lifecycle-queryrepl-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupPath, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", backupPath);

let changed = 0;
for (const node of wf.nodes || []) {
  const next = REPLACEMENTS[node.name];
  if (!next) continue;
  const prev = String(node.parameters?.options?.queryReplacement || "");
  if (prev === next) {
    console.log("ok", node.name);
    continue;
  }
  node.parameters = node.parameters || {};
  node.parameters.options = node.parameters.options || {};
  node.parameters.options.queryReplacement = next;
  node.alwaysOutputData = true;
  changed += 1;
  console.log("patched", node.name);
  console.log("  from", prev);
  console.log("  to  ", next);
}

if (!changed) {
  console.log("nothing to patch");
  process.exit(0);
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PUT",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    staticData: wf.staticData,
    active: true
  })
});
if (!patchRes.ok) {
  // fallback PATCH
  const patch2 = await fetch(`${base}/rest/workflows/${summary.id}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
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
console.log("patched query replacements:", changed);
