/**
 * Dump full query/jsCode for care-items sync prep node.
 *   node scripts/inspect-n8n-care-sync-prep.mjs
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
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === "faqs");
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;
const node = (wf.nodes || []).find(n => n.name === "panel_care_items_sync_prep");
console.log(node?.parameters?.jsCode || node?.parameters?.query || "missing");
