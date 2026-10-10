/**
 * panel/update/profile: accept Liom CDN URL only (no file proxy via n8n).
 *
 *   node scripts/patch-n8n-panel-update-profile-url.mjs
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW = "panel2";
const WEBHOOK = "panel/update/profile";
const UPLOAD = "upload2";

const PASSTHROUGH = `const body = $("panel/update/profile").first().json.body || {};
const raw = body.image;
const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
const first = list[0];
if (first && typeof first === "object" && first.contents) {
  throw new Error("فایل را مستقیم به Liom آپلود کنید و فقط URL بفرستید.");
}
const url =
  typeof first === "string"
    ? first.trim()
    : String(first?.url || body.main_image || body.image_url || "").trim();
if (!/^https:\\/\\//i.test(url)) {
  throw new Error("آدرس تصویر پروفایل معتبر نیست.");
}
if (
  !/poshtiban\\.com\\//i.test(url) &&
  !/liom\\.app\\//i.test(url) &&
  !/lioms3\\//i.test(url)
) {
  throw new Error("آدرس تصویر باید از سرویس فایل سایبان باشد.");
}
return [{ json: { success: true, result: [{ url }] } }];
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
const summary = (list.data || []).find(w => w.name === WORKFLOW);
if (!summary) throw new Error(`workflow ${WORKFLOW} not found`);
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `panel2-update-profile-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
const upload2 = byName[UPLOAD];
const webhook = byName[WEBHOOK];
if (!upload2 || !webhook) throw new Error("update/profile nodes missing");

upload2.type = "n8n-nodes-base.code";
upload2.typeVersion = 2;
delete upload2.credentials;
upload2.parameters = { jsCode: PASSTHROUGH };

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    active: true
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}
console.log("panel/update/profile → URL-only (no Liom file proxy) OK");
