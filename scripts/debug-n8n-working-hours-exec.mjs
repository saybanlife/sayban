/**
 * Inspect recent panel2 executions for panel/update/center errors.
 *   node scripts/debug-n8n-working-hours-exec.mjs
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
const ids = process.argv.slice(2);
let targetIds = ids;
if (!targetIds.length) {
  const ex = await fetch(
    `${base}/rest/executions?filter=${encodeURIComponent(
      JSON.stringify({ workflowId: String(summary.id) })
    )}&limit=6`,
    { headers: { Cookie: cookie } }
  ).then(r => r.json());
  const rows = ex.data?.results || [];
  targetIds = rows.map(e => String(e.id));
  console.log(
    "latest",
    rows.map(e => ({ id: e.id, status: e.status, at: e.startedAt }))
  );
}

for (const id of targetIds) {
  const one = await fetch(
    `${base}/rest/executions/${id}?includeData=true`,
    { headers: { Cookie: cookie } }
  ).then(r => r.json());
  const d = one.data || one;
  let data = d.data;
  console.log("\n====", id, "status", d.status, "finished", d.finished);

  // Prefer unflattened if available
  const runData =
    data?.resultData?.runData ||
    (typeof data === "object" && !Array.isArray(data)
      ? data?.runData
      : null);

  if (runData && typeof runData === "object" && !Array.isArray(runData)) {
    for (const [name, runs] of Object.entries(runData)) {
      const last = runs[runs.length - 1];
      if (last?.error) {
        console.log(
          "ERR",
          name,
          last.error.message,
          last.error.description || ""
        );
      } else {
        const item = last?.data?.main?.[0]?.[0]?.json;
        console.log("ok", name, JSON.stringify(item || {}).slice(0, 220));
      }
    }
    continue;
  }

  // Flatted array format from n8n
  if (Array.isArray(data)) {
    const s = JSON.stringify(data);
    const lastNode = s.match(/"lastNodeExecuted":"([^"]+)"/);
    console.log("lastNode", lastNode?.[1]);
    const msgs = [...s.matchAll(/"message":"([^"\\]{1,400})"/g)].map(m => m[1]);
    console.log("messages", [...new Set(msgs)].slice(0, 15));
    for (const v of data) {
      if (v && typeof v === "object" && v.message && (v.name || v.stack)) {
        console.log("errObj", v.name, v.message, (v.description || "").slice(0, 200));
      }
    }
    // dump webhook + code input shapes
    const bodyHints = [...s.matchAll(/"center_id":([^,}]+)/g)].slice(0, 5);
    console.log("center_id hints", bodyHints.map(m => m[1]));
    continue;
  }

  console.log("unknown data", typeof data, JSON.stringify(data).slice(0, 500));
}
