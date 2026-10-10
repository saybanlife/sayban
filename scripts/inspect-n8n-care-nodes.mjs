/**
 * Inspect care/specialist nodes in n8n faqs + sayban2 workflows.
 *   node scripts/inspect-n8n-care-nodes.mjs
 */
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".cursor/sayban-ops/secrets/n8n_sayban.env", "utf8")
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
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
if (!loginRes.ok) throw new Error("login " + loginRes.status);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());

for (const name of ["faqs", "sayban2"]) {
  const summary = (list.data || []).find(w => w.name === name);
  if (!summary) {
    console.log("missing", name);
    continue;
  }
  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const wf = detail.data || detail;
  const nodes = (wf.nodes || []).filter(n =>
    /care|specialist/i.test(n.name)
  );
  console.log("\n==", name, "==");
  for (const n of nodes) {
    const q = n.parameters?.query || n.parameters?.jsCode || "";
    const repl = n.parameters?.options?.queryReplacement || "";
    console.log("---", n.name);
    console.log(String(q).slice(0, 500));
    if (repl) console.log("repl:", String(repl).slice(0, 300));
  }
}
