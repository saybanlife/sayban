/**
 * Adds update/delete webhooks to the n8n `users` workflow:
 *   POST update/patient  POST delete/patient
 *   POST update/address  POST delete/address
 *
 * All require jwtAuth and scope rows to jwtPayload.id (user_id).
 *
 *   node scripts/add-n8n-patient-address-crud.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "users";
const TEMPLATE_SQL_NODE = "MySQL11";
const TEMPLATE_WEBHOOK_NODE = "add/address3";
const TEMPLATE_CODE_NODE = "Code5";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook10";

const ADDED_NODES = [
  "update/patient",
  "patient_update_sql",
  "patient_update_format",
  "patient_update_respond",
  "delete/patient",
  "patient_delete_sql",
  "patient_delete_format",
  "patient_delete_respond",
  "update/address",
  "address_update_sql",
  "address_update_format",
  "address_update_respond",
  "delete/address",
  "address_delete_sql",
  "address_delete_format",
  "address_delete_respond"
];

const WRAP_RESULT = `const rows = items
  .map(item => item.json)
  .filter(row => row && Object.keys(row).length > 0);
return [{ json: { success: true, result: rows[0] || { affected: true } } }];
`;

const WRAP_OK = `return [{ json: { success: true, result: true } }];`;

const UPDATE_PATIENT = `UPDATE users__patient
SET name = $3,
    national_code = $4,
    mobile = $5,
    gender = $6,
    marital_status = $7,
    relation = $8,
    city = $9,
    address = $10,
    details = $11,
    postal_code = $12,
    latitude = $13,
    longitude = $14
WHERE id = $1 AND user_id = $2;`;

const DELETE_PATIENT =
  "DELETE FROM users__patient WHERE id = $1 AND user_id = $2;";

const UPDATE_ADDRESS = `UPDATE users__addresses
SET title = $3,
    city = $4,
    address = $5,
    details = $6,
    postal_code = $7,
    latitude = $8,
    longitude = $9
WHERE id = $1 AND user_id = $2;`;

const DELETE_ADDRESS =
  "DELETE FROM users__addresses WHERE id = $1 AND user_id = $2;";

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
  `${WORKFLOW_NAME}-crud-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  nodes = nodes.filter(n => !ADDED_NODES.includes(n.name));
  for (const name of ADDED_NODES) delete connections[name];
} else {
  if (nodes.some(n => ADDED_NODES.includes(n.name))) {
    console.log("nodes already present; nothing to do");
    process.exit(0);
  }

  const sqlTemplate = nodes.find(n => n.name === TEMPLATE_SQL_NODE);
  const webhookTemplate = nodes.find(n => n.name === TEMPLATE_WEBHOOK_NODE);
  const codeTemplate = nodes.find(n => n.name === TEMPLATE_CODE_NODE);
  const respondTemplate = nodes.find(n => n.name === TEMPLATE_RESPOND_NODE);
  for (const [label, node] of [
    [TEMPLATE_SQL_NODE, sqlTemplate],
    [TEMPLATE_WEBHOOK_NODE, webhookTemplate],
    [TEMPLATE_CODE_NODE, codeTemplate],
    [TEMPLATE_RESPOND_NODE, respondTemplate]
  ]) {
    if (!node) throw new Error(`template node ${label} not found`);
  }

  const originX = (webhookTemplate.position?.[0] ?? 0) + 400;
  const originY = (webhookTemplate.position?.[1] ?? 0) + 520;

  const webhookNode = (name, pathValue, row) => ({
    parameters: {
      httpMethod: "POST",
      path: pathValue,
      authentication: "jwtAuth",
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: webhookTemplate.typeVersion,
    position: [originX, originY + row * 180],
    id: crypto.randomUUID(),
    name,
    webhookId: crypto.randomUUID(),
    credentials: webhookTemplate.credentials
      ? JSON.parse(JSON.stringify(webhookTemplate.credentials))
      : undefined
  });

  const sqlNode = (name, query, queryReplacement, col, row) => ({
    parameters: {
      operation: "executeQuery",
      query,
      options: { queryReplacement }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: sqlTemplate.typeVersion,
    position: [originX + col * 220, originY + row * 180],
    id: crypto.randomUUID(),
    name,
    credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
  });

  const codeNode = (name, jsCode, col, row) => ({
    parameters: { jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: codeTemplate.typeVersion,
    position: [originX + col * 220, originY + row * 180],
    id: crypto.randomUUID(),
    name
  });

  const respondNode = (name, col, row) => ({
    parameters: { options: {} },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: respondTemplate.typeVersion,
    position: [originX + col * 220, originY + row * 180],
    id: crypto.randomUUID(),
    name
  });

  const jwtId = wh =>
    `={{ $('${wh}').item.json.jwtPayload.id.toString() }}`;
  const body = (wh, key) =>
    `={{ $('${wh}').item.json.body.${key} }}`;

  const chain = (
    whName,
    pathValue,
    sqlName,
    sqlQuery,
    sqlReplacement,
    formatName,
    respondName,
    row,
    wrapCode = WRAP_OK
  ) => {
    nodes.push(
      webhookNode(whName, pathValue, row),
      sqlNode(sqlName, sqlQuery, sqlReplacement, 1, row),
      codeNode(formatName, wrapCode, 2, row),
      respondNode(respondName, 3, row)
    );
    connections[whName] = { main: [[{ node: sqlName, type: "main", index: 0 }]] };
    connections[sqlName] = {
      main: [[{ node: formatName, type: "main", index: 0 }]]
    };
    connections[formatName] = {
      main: [[{ node: respondName, type: "main", index: 0 }]]
    };
  };

  const whUpdatePatient = "update/patient";
  chain(
    whUpdatePatient,
    "update/patient",
    "patient_update_sql",
    UPDATE_PATIENT,
    `={{ $('${whUpdatePatient}').item.json.body.id }},${jwtId(
      whUpdatePatient
    )},${body(whUpdatePatient, "name")},${body(
      whUpdatePatient,
      "national_code"
    )},${body(whUpdatePatient, "mobile")},${body(
      whUpdatePatient,
      "gender"
    )},${body(whUpdatePatient, "marital_status")},${body(
      whUpdatePatient,
      "relation"
    )},${body(whUpdatePatient, "city") ?? "null"},${body(
      whUpdatePatient,
      "address"
    ) ?? "null"},${body(whUpdatePatient, "details") ?? "null"},${body(
      whUpdatePatient,
      "postal_code"
    ) ?? "null"},${body(whUpdatePatient, "latitude") ?? "null"},${body(
      whUpdatePatient,
      "longitude"
    ) ?? "null"}`,
    "patient_update_format",
    "patient_update_respond",
    0,
    WRAP_OK
  );

  const whDeletePatient = "delete/patient";
  chain(
    whDeletePatient,
    "delete/patient",
    "patient_delete_sql",
    DELETE_PATIENT,
    `={{ $('${whDeletePatient}').item.json.body.id }},${jwtId(
      whDeletePatient
    )}`,
    "patient_delete_format",
    "patient_delete_respond",
    1
  );

  const whUpdateAddress = "update/address";
  chain(
    whUpdateAddress,
    "update/address",
    "address_update_sql",
    UPDATE_ADDRESS,
    `={{ $('${whUpdateAddress}').item.json.body.id }},${jwtId(
      whUpdateAddress
    )},${body(whUpdateAddress, "title")},${body(
      whUpdateAddress,
      "city"
    )},${body(whUpdateAddress, "address")},${body(
      whUpdateAddress,
      "details"
    )},${body(whUpdateAddress, "postal_code")},${body(
      whUpdateAddress,
      "latitude"
    )},${body(whUpdateAddress, "longitude")}`,
    "address_update_format",
    "address_update_respond",
    2,
    WRAP_OK
  );

  const whDeleteAddress = "delete/address";
  chain(
    whDeleteAddress,
    "delete/address",
    "address_delete_sql",
    DELETE_ADDRESS,
    `={{ $('${whDeleteAddress}').item.json.body.id }},${jwtId(
      whDeleteAddress
    )}`,
    "address_delete_format",
    "address_delete_respond",
    3
  );
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
    ? "reverted patient/address update+delete webhooks"
    : "added update/patient, delete/patient, update/address, delete/address"
);
