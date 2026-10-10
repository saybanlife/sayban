/**
 * Add user address coordinates to panel reservations SELECT.
 *
 * Apply:    node scripts/patch-panel-reservation-user-address-coords.mjs
 * Rollback: node scripts/patch-panel-reservation-user-address-coords.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_ID = "66g05UtTt6agbsIR";
const NODE_NAME = "MySQL59";
const SELECT_ANCHOR = "    ua.postal_code AS user_address_postal_code,";
const SELECT_PATCH = `    ua.postal_code AS user_address_postal_code,
    ua.latitude AS user_address_latitude,
    ua.longitude AS user_address_longitude,`;

const env = Object.fromEntries(
  fs
    .readFileSync(
      path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env"),
      "utf8"
    )
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith("#"))
    .map(line => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    })
);
const base = String(env.N8N_URL || "").replace(/\/$/, "");
const revert = process.argv.includes("--revert");

async function fetchWorkflow(cookie) {
  const response = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`workflow fetch failed: ${response.status}`);
  const payload = await response.json();
  return payload.data || payload;
}

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
const workflow = await fetchWorkflow(cookie);

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `panel-reservations-user-address-coords-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = JSON.parse(JSON.stringify(workflow.nodes));
const mysql = nodes.find(node => node.name === NODE_NAME);
if (!mysql) throw new Error(`${NODE_NAME} node not found`);
let query = String(mysql.parameters?.query || "");

if (revert) {
  if (!query.includes("ua.latitude AS user_address_latitude")) {
    console.log("already reverted; nothing to do");
    process.exit(0);
  }
  query = query.replace(SELECT_PATCH, SELECT_ANCHOR);
} else {
  if (query.includes("ua.latitude AS user_address_latitude")) {
    console.log("already patched; nothing to do");
    process.exit(0);
  }
  if (!query.includes(SELECT_ANCHOR)) {
    throw new Error(
      "anchor missing — run patch-panel-reservation-user-address.mjs first"
    );
  }
  query = query.replace(SELECT_ANCHOR, SELECT_PATCH);
}

mysql.parameters.query = query;

const patch = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: workflow.name,
    nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
    staticData: workflow.staticData
  })
});
if (!patch.ok) {
  throw new Error(
    `workflow patch failed: ${patch.status} ${await patch.text()}`
  );
}

const verified = await fetchWorkflow(cookie);
const verifiedQuery = String(
  verified.nodes.find(node => node.name === NODE_NAME)?.parameters?.query || ""
);
const hasCoords = verifiedQuery.includes(
  "ua.latitude AS user_address_latitude"
);
if (hasCoords === revert) {
  throw new Error("workflow verification failed");
}
console.log(
  revert
    ? "panel reservation address coords reverted and verified"
    : "panel reservation address coords applied and verified"
);
