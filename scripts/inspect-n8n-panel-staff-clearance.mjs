/**
 * Read-only: inspect panel-staff n8n MySQL insert/update for no_criminal_record.
 * Does not mutate the workflow unless --apply is passed (not used by default).
 *
 *   node scripts/inspect-n8n-panel-staff-clearance.mjs
 */
import fs from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = /^([^#=]+)=(.*)$/.exec(line);
    if (!m) continue;
    out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv(
  path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env")
);
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
const cookie = loginRes.headers.getSetCookie?.()?.join("; ") || "";
const headers = {
  Cookie: cookie,
  "Content-Type": "application/json"
};

const list = await fetch(`${base}/rest/workflows?limit=250`, { headers });
const workflows = (await list.json()).data || [];
const summary = workflows.find(
  w => w.name === "panel-staff" || /panel.?staff/i.test(w.name)
);
if (!summary) {
  console.log(
    "workflows:",
    workflows.map(w => w.name).filter(n => /staff/i.test(n)).join(", ")
  );
  throw new Error("panel-staff workflow not found");
}

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, { headers });
const wf = await detail.json();
const nodes = wf.data?.nodes || wf.nodes || [];

const mysqlNodes = nodes.filter(n =>
  String(n.type || "").includes("mySql") || String(n.type || "").includes("mysql")
);
const codeNodes = nodes.filter(n => String(n.type || "").includes("code"));

console.log("workflow", summary.name, summary.id, "active=", summary.active);
console.log("mysql nodes:", mysqlNodes.map(n => n.name).join(" | "));

for (const n of mysqlNodes) {
  const p = n.parameters || {};
  const op = p.operation || p.query || "";
  const table = p.table || p.tableId || "";
  const cols =
    p.columns ||
    p.columnToMatchOn ||
    p.valuesToSend ||
    p.options ||
    null;
  const auto =
    p.dataMode ||
    p.columnMode ||
    p.options?.queryBatching ||
    JSON.stringify(p).includes("autoMap");
  console.log("---", n.name);
  console.log("  type=", n.type, "op=", typeof op === "string" ? op.slice(0, 120) : op);
  console.log("  table=", table);
  console.log(
    "  paramsKeys=",
    Object.keys(p).join(",")
  );
  const raw = JSON.stringify(p);
  console.log(
    "  mentions_no_criminal_record=",
    raw.includes("no_criminal_record")
  );
  console.log(
    "  autoMap-ish=",
    /autoMap|automatically|defineBelow|mapInput/i.test(raw)
  );
  if (/INSERT|UPDATE|centers__staffs/i.test(raw)) {
    console.log("  snippet=", raw.slice(0, 400));
  }
}

for (const name of ["MySQL52", "MySQL53", "Code45"]) {
  const n = nodes.find(x => x.name === name);
  if (!n) continue;
  console.log("====", name, "typeVersion", n.typeVersion);
  console.log(JSON.stringify(n.parameters, null, 2).slice(0, 2500));
  if (name === "Code45") {
    console.log("CODE:", String(n.parameters?.jsCode || "").slice(0, 900));
  }
}
