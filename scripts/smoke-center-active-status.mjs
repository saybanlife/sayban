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
const webhookBase = (env.N8N_WEBHOOK_BASE || "").replace(/\/$/, "");

const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === "panel2");
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;
const mysql = wf.nodes.find(n => n.name === "MySQL1");
console.log(
  "has is_active col",
  /c\.is_active\s+AS\s+is_active/i.test(String(mysql.parameters.query))
);
console.log(
  "has active webhook",
  wf.nodes.some(n => n.name === "center active status")
);

await fetch(`${base}/rest/workflows/${summary.id}/deactivate`, {
  method: "POST",
  headers: { Cookie: cookie }
});
const act = await fetch(`${base}/rest/workflows/${summary.id}/activate`, {
  method: "POST",
  headers: { Cookie: cookie }
});
console.log("reactivate", act.status);

const centers = await fetch(
  `${webhookBase}/panel/centers?limit=1&page=1`,
  { headers: { Accept: "application/json" } }
).then(r => r.json());
const row = centers?.result?.[0] || centers?.[0] || null;
console.log("sample row keys", row ? Object.keys(row) : centers);

const testId = row?.id || 157;
const beforeActive = Number(row?.is_active);
const nextActive = beforeActive === 1 ? 0 : 1;
const post = await fetch(`${webhookBase}/panel/center/active-status`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  },
  body: JSON.stringify({ center_id: Number(testId), is_active: nextActive })
});
const postBody = await post.text();
console.log("active-status", post.status, postBody);

const restore = await fetch(`${webhookBase}/panel/center/active-status`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  },
  body: JSON.stringify({
    center_id: Number(testId),
    is_active: beforeActive
  })
});
console.log("restore", restore.status, await restore.text());
