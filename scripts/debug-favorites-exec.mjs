import fs from "node:fs";
import path from "node:path";

function readEnv() {
  const envPath = path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env");
  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#")).map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
  );
}
function unflatten(data) {
  if (typeof data === "string") data = JSON.parse(data);
  if (!Array.isArray(data)) return data;
  const values = data;
  const hydrated = [];
  function resolve(i, stack = new Set()) {
    if (hydrated[i] !== undefined) return hydrated[i];
    if (stack.has(i)) return null;
    stack.add(i);
    const v = values[i];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const obj = {};
      hydrated[i] = obj;
      for (const [k, val] of Object.entries(v)) {
        obj[k] = typeof val === "string" && /^\d+$/.test(val) ? resolve(Number(val), stack) : val;
      }
      return obj;
    }
    hydrated[i] = v;
    return v;
  }
  return resolve(0);
}
const env = readEnv();
const base = env.N8N_URL.replace(/\/$/, "");
const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ emailOrLdapLoginId: env.N8N_USER, password: env.N8N_PASSWORD })
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, { headers: { Cookie: cookie } }).then(r => r.json());
const summary = list.data.find(w => w.name === "users");
const ex = await fetch(
  `${base}/rest/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId: String(summary.id) }))}&limit=3`,
  { headers: { Cookie: cookie } }
).then(r => r.json());
const rows = ex.data?.results || [];
console.log(rows.map(e => ({ id: e.id, status: e.status, at: e.startedAt })));
const target = rows.find(e => true);
const one = await fetch(`${base}/rest/executions/${process.argv[2] || target.id}?includeData=true`, { headers: { Cookie: cookie } }).then(r => r.json());
const root = unflatten((one.data || one).data);
console.log("last", root?.resultData?.lastNodeExecuted, root?.resultData?.error?.message);
const run = root?.resultData?.runData || {};
for (const [name, runs] of Object.entries(run)) {
  const last = runs[runs.length - 1];
  const item = last?.data?.main?.[0]?.[0]?.json;
  console.log(name, last?.error?.message || JSON.stringify(item || {}).slice(0, 220));
}
