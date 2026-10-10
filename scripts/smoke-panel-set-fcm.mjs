import fs from "node:fs";
import path from "node:path";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

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
const webhook = resolveApiUrl(PANEL_ROUTES.setFcmToken);
console.log("endpoint", webhook);

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
await fetch(`${base}/rest/workflows/${summary.id}/deactivate`, {
  method: "POST",
  headers: { Cookie: cookie }
}).catch(() => null);
const act = await fetch(`${base}/rest/workflows/${summary.id}/activate`, {
  method: "POST",
  headers: { Cookie: cookie }
});
console.log("reactivate", act.status, await act.text().then(t => t.slice(0, 120)));

const unauth = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ token: "test-fcm-token", platform: "web" })
});
console.log("unauth", unauth.status, (await unauth.text()).slice(0, 200));
