/**
 * Fix empty respond bodies on panel delete webhooks.
 *   node scripts/patch-n8n-delete-respond-json.mjs
 */
import fs from "node:fs";
import path from "node:path";

const TARGETS = [
  { id: "A9UoaMCH5ThcTbG5", nodes: ["users_delete_respond"] },
  { id: null, name: "panel2", nodes: ["panel_reviews_delete_respond"] }
];

const FORMAT_JS = `const auth = $('users_delete_auth').first().json;
if (!auth.ok) {
  const msg = auth.role !== 'super_admin'
    ? 'دسترسی حذف کاربر ندارید.'
    : 'شناسه کاربر نامعتبر است.';
  return [{ json: { success: false, message: msg } }];
}
const stillThere = items.some(item => item.json && item.json.id != null);
if (stillThere) {
  return [{ json: { success: false, message: 'حذف کاربر ناموفق بود. ممکن است رزرو یا وابستگی فعال داشته باشد.' } }];
}
return [{ json: { success: true, message: 'کاربر با موفقیت حذف شد.', deleted_id: auth.user_id } }];
`;

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
if (!loginRes.ok) throw new Error(`n8n login failed: ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());

for (const target of TARGETS) {
  const summary = target.id
    ? { id: target.id }
    : (list.data || []).find(w => w.name === target.name);
  if (!summary?.id) continue;

  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const wf = detail.data || detail;
  let changed = false;

  for (const node of wf.nodes) {
    if (target.nodes.includes(node.name)) {
      node.parameters = {
        respondWith: "json",
        responseBody: "={{ JSON.stringify($json) }}",
        options: {}
      };
      changed = true;
    }
    if (node.name === "users_delete_format") {
      node.parameters.jsCode = FORMAT_JS;
      changed = true;
    }
  }

  if (!changed) continue;
  const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings || {}
    })
  });
  if (!patchRes.ok) {
    throw new Error(`patch ${summary.id} failed: ${patchRes.status}`);
  }
  console.log("patched respond nodes on", summary.id);
}
