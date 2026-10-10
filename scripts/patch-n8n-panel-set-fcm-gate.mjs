/**
 * Gate panel_set_fcm_update so empty FCM body cannot wipe panel__users.fcmToken.
 * Inserts an IF between auth and update; false branch goes to format+respond.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function readEnv(p) {
  return Object.fromEntries(
    fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

const AUTH = "panel_set_fcm_auth";
const UPDATE = "panel_set_fcm_update";
const READ = "panel_set_fcm_read";
const FORMAT = "panel_set_fcm_format";
const RESPOND = "panel_set_fcm_respond";
const GATE = "panel_set_fcm_ok_gate";

const env = readEnv(
  path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env")
);
const base = (env.N8N_URL || "").replace(/\/$/, "");
const cookie = (
  await fetch(`${base}/rest/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrLdapLoginId: env.N8N_USER,
      password: env.N8N_PASSWORD
    })
  })
).headers
  .get("set-cookie")
  .split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === "panel2");
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `panel2-panel-fcm-gate-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", path.relative(process.cwd(), backupFile));

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (nodes.some(n => n.name === GATE)) {
  console.log("gate already present");
  process.exit(0);
}

const authNode = nodes.find(n => n.name === AUTH);
const updateNode = nodes.find(n => n.name === UPDATE);
if (!authNode || !updateNode) throw new Error("missing auth/update nodes");

const x = (authNode.position?.[0] ?? 0) + 110;
const y = (authNode.position?.[1] ?? 0) + 140;

nodes.push({
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: "",
        typeValidation: "strict",
        version: 2
      },
      conditions: [
        {
          id: crypto.randomUUID(),
          leftValue: "={{ $json.ok }}",
          rightValue: true,
          operator: { type: "boolean", operation: "true", singleValue: true }
        }
      ],
      combinator: "and"
    },
    options: {}
  },
  type: "n8n-nodes-base.if",
  typeVersion: 2.2,
  position: [x, y],
  id: crypto.randomUUID(),
  name: GATE
});

connections[AUTH] = {
  main: [[{ node: GATE, type: "main", index: 0 }]]
};
connections[GATE] = {
  main: [
    [{ node: UPDATE, type: "main", index: 0 }],
    [{ node: FORMAT, type: "main", index: 0 }]
  ]
};

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
console.log("gated panel setFcmToken update on auth.ok");
