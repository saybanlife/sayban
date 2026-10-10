/**
 * Dump panel/update/center branch nodes from live panel2.
 *   node scripts/debug-n8n-working-hours-nodes.mjs
 */
import fs from "node:fs";
import path from "node:path";

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

function unflatten(data) {
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(data)) return data;
  // minimal flatted revive
  const values = data;
  const hydrated = new Array(values.length);
  function resolve(i, stack = new Set()) {
    if (hydrated[i] !== undefined) return hydrated[i];
    if (stack.has(i)) return null;
    stack.add(i);
    const v = values[i];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const obj = {};
      hydrated[i] = obj;
      for (const [k, val] of Object.entries(v)) {
        obj[k] =
          typeof val === "string" && /^\d+$/.test(val)
            ? resolve(Number(val), stack)
            : Array.isArray(val)
              ? val.map(x =>
                  typeof x === "string" && /^\d+$/.test(x)
                    ? resolve(Number(x), stack)
                    : x
                )
              : val;
      }
      return obj;
    }
    if (Array.isArray(v)) {
      const arr = [];
      hydrated[i] = arr;
      for (const x of v) {
        arr.push(
          typeof x === "string" && /^\d+$/.test(x) ? resolve(Number(x), stack) : x
        );
      }
      return arr;
    }
    hydrated[i] = v;
    return v;
  }
  return resolve(0);
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
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === "panel2");
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const http = wf.nodes.find(n => n.name === "HTTP Request2");
console.log("HTTP Request2", JSON.stringify(http?.parameters, null, 2));
console.log("HTTP onError", http?.onError, "continueOnFail", http?.continueOnFail);
console.log(
  "connections from update/center",
  JSON.stringify(wf.connections["panel/update/center"], null, 2)
);

const id = process.argv[2] || "99053";
const one = await fetch(`${base}/rest/executions/${id}?includeData=true`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const d = one.data || one;
const root = unflatten(d.data);
const runData = root?.resultData?.runData;
console.log("\nexecution", id, "error", root?.resultData?.error?.message);
console.log("lastNode", root?.resultData?.lastNodeExecuted);
if (runData) {
  for (const [name, runs] of Object.entries(runData)) {
    const last = runs[runs.length - 1];
    console.log(
      "-",
      name,
      last?.error
        ? `ERR ${last.error.message}`
        : `ok ${JSON.stringify(last?.data?.main?.[0]?.[0]?.json || {}).slice(0, 180)}`
    );
  }
} else {
  console.log("unflatten failed", typeof d.data, String(d.data).slice(0, 200));
}
