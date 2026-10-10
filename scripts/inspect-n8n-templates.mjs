/**
 * Inspect node types / template nodes in an n8n workflow:
 *   node scripts/inspect-n8n-templates.mjs <workflowName>
 * Reads credentials from .cursor/sayban-ops/secrets/n8n_sayban.env (never printed).
 */
import fs from "node:fs";
import path from "node:path";

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
const want = (process.argv[2] || "panel2").toLowerCase();

const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!login.ok) throw new Error(`login failed ${login.status}`);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name.toLowerCase() === want);
if (!summary) throw new Error(`workflow ${want} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const counts = {};
for (const n of wf.nodes) {
  const key = `${n.type}@${n.typeVersion}`;
  counts[key] = (counts[key] || 0) + 1;
}
console.log("workflow:", wf.name, wf.id, "nodes:", wf.nodes.length);
console.log("types:", JSON.stringify(counts, null, 1));

const jwtHook = wf.nodes.find(
  n => n.type === "n8n-nodes-base.webhook" && n.parameters?.authentication === "jwtAuth"
);
console.log(
  "jwtAuth webhook template:",
  JSON.stringify(
    jwtHook && {
      name: jwtHook.name,
      typeVersion: jwtHook.typeVersion,
      parameters: jwtHook.parameters,
      credentials: jwtHook.credentials
    },
    null,
    1
  )
);

const ifNode = wf.nodes.find(
  n => n.type === "n8n-nodes-base.if" || n.type === "n8n-nodes-base.switch"
);
console.log(
  "if/switch template:",
  JSON.stringify(
    ifNode && { name: ifNode.name, type: ifNode.type, typeVersion: ifNode.typeVersion, parameters: ifNode.parameters },
    null,
    1
  )
);

const insertNode = wf.nodes.find(
  n => n.type === "n8n-nodes-base.mySql" && n.parameters?.operation === "insert"
);
console.log(
  "mysql insert template:",
  JSON.stringify(
    insertNode && { name: insertNode.name, typeVersion: insertNode.typeVersion, parameters: insertNode.parameters },
    null,
    1
  )
);
