/**
 * Prints recent n8n executions (optionally filtered by workflow name) with the
 * failing node and error message, for debugging webhook changes.
 *
 *   node scripts/n8n-last-executions.mjs [workflowName] [count]
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(
  process.cwd(),
  ".cursor/sayban-ops/secrets/n8n_sayban.env"
);
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trim().startsWith("#"))
    .map(line => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const base = (env.N8N_URL || "").replace(/\/$/, "");
const wantWorkflow = process.argv[2] || "";
const count = Number(process.argv[3] || 5);

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

const listRes = await fetch(`${base}/rest/executions?limit=40`, {
  headers: { Cookie: cookie, Accept: "application/json" }
});
const listJson = await listRes.json();
const rows = listJson?.data?.results || listJson?.data || [];

const filtered = wantWorkflow
  ? rows.filter(r => (r.workflowName || r.workflowData?.name) === wantWorkflow)
  : rows;

for (const row of filtered.slice(0, count)) {
  const detail = await fetch(`${base}/rest/executions/${row.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const data = detail?.data?.data || detail?.data;
  const runData = data?.resultData?.runData || {};
  const error = data?.resultData?.error;

  const failing = Object.entries(runData)
    .filter(([, runs]) => runs?.some?.(run => run?.error))
    .map(([name, runs]) => {
      const err = runs.find(run => run.error)?.error;
      return `${name}: ${err?.message || err?.description || "error"}`;
    });

  console.log(
    JSON.stringify(
      {
        id: row.id,
        workflow: row.workflowName || detail?.data?.workflowData?.name,
        status: row.status,
        startedAt: row.startedAt,
        topLevelError: error?.message,
        lastNode: data?.resultData?.lastNodeExecuted,
        failingNodes: failing,
        nodesRun: Object.keys(runData)
      },
      null,
      1
    )
  );
}
