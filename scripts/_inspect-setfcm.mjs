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
      .filter(l => l.trim() && !l.trim().startsWith("#"))
      .map(l => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const env = readEnv();
const base = env.N8N_URL.replace(/\/$/, "");
const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const detail = await fetch(`${base}/rest/workflows/YHmCK0NHUpyMH2jX`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;
for (const n of wf.nodes) {
  if (
    ["setFcmToken", "MySQL1", "MySQL"].includes(n.name) ||
    /fcm|jwt|auth|token/i.test(n.name)
  ) {
    console.log("\n===", n.name, n.type, "===");
    console.log(JSON.stringify(n.parameters, null, 2).slice(0, 3000));
    if (n.credentials) console.log("creds", Object.keys(n.credentials));
  }
}
console.log("\nfrom setFcmToken:", JSON.stringify(wf.connections.setFcmToken));
for (const [from, c] of Object.entries(wf.connections || {})) {
  const s = JSON.stringify(c);
  if (s.includes("setFcmToken") || /fcm/i.test(from)) {
    console.log(from, "->", s.slice(0, 500));
  }
}
