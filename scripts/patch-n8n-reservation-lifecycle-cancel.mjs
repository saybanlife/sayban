/**
 * Patch live n8n `reservations` workflow:
 * - Expand cancel_request allowlist (UI/server parity)
 * - Include MD5(c.id) AS center_public_id on details SELECT
 *
 *   node scripts/patch-n8n-reservation-lifecycle-cancel.mjs
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "reservations";

const OLD_CANCEL_STATUSES =
  "('draft','registered','pending','awaitingOffers','offersReceived')";
const NEW_CANCEL_STATUSES =
  "('draft','registered','pending','awaitingOffers','awaitingSupport','offersReceived','nurseSelected','awaitingPayment','paymentCompleted','confirmed','finalConfirmed','readyForDispatch')";

const OLD_VALIDATE_OK =
  'const ok = ["draft", "registered", "pending", "awaitingOffers", "offersReceived"];';
const NEW_VALIDATE_OK = `const ok = [
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
  ];`;

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

const backupDir = path.join(process.cwd(), ".cursor", "sayban-ops", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(
  backupDir,
  `${WORKFLOW_NAME}-lifecycle-cancel-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupPath, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", backupPath);

let changed = 0;
for (const node of wf.nodes || []) {
  if (node.name === "res_life_cancel") {
    const query = String(node.parameters?.query || "");
    let next = query;
    if (query.includes(OLD_CANCEL_STATUSES)) {
      next = query.replace(OLD_CANCEL_STATUSES, NEW_CANCEL_STATUSES);
    } else if (
      query.includes("status IN") &&
      !query.includes("readyForDispatch")
    ) {
      next = query.replace(/status IN \([^)]+\)/, `status IN ${NEW_CANCEL_STATUSES}`);
    }
    if (next !== query) {
      node.parameters.query = next;
      changed += 1;
      console.log("patched res_life_cancel");
    }
  }
  if (node.name === "res_life_validate") {
    const js = String(node.parameters?.jsCode || "");
    if (js.includes(OLD_VALIDATE_OK)) {
      node.parameters.jsCode = js.replace(OLD_VALIDATE_OK, NEW_VALIDATE_OK);
      changed += 1;
      console.log("patched res_life_validate");
    } else if (
      js.includes("awaitingSupport") &&
      js.includes("readyForDispatch")
    ) {
      console.log("res_life_validate already expanded");
    }
  }
  if (node.name === "res_details_select") {
    const query = String(node.parameters?.query || "");
    if (
      !query.includes("center_public_id") &&
      query.includes("center_longitude")
    ) {
      node.parameters.query = query.replace(
        "c.longitude AS center_longitude,",
        "c.longitude AS center_longitude,\n  MD5(c.id) AS center_public_id,"
      );
      changed += 1;
      console.log("patched res_details_select");
    }
  }
}

if (!changed) {
  console.log("No changes needed");
  process.exit(0);
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
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
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

console.log("Updated reservations lifecycle cancel allowlist");
