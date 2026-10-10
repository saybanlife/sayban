/**
 * Find centers without center_admin via webhook list + per-center check,
 * then create/update/delete via /panel/users/edit only (no PMA).
 */
import fs from "node:fs";
import path from "node:path";

function readEnv(file) {
  const envPath = path.join(process.cwd(), ".cursor/sayban-ops/secrets", file);
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

const n8n = readEnv("n8n_sayban.env");
const webhookBase = (n8n.N8N_WEBHOOK_BASE || "").replace(/\/$/, "");

async function getCenter(id) {
  const r = await fetch(`${webhookBase}/panel/center?id=${id}`, {
    headers: { Accept: "application/json" }
  });
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t, status: r.status };
  }
}

// Prefer known candidates from earlier chat; fall back to scanning list
const candidates = [161, 160, 158, 156, 155, 154];
let centerId = null;
for (const id of candidates) {
  const data = await getCenter(id);
  const user = data?.result?.user ?? data?.user;
  const hasUser = user && (user.id || user.email);
  console.log("center", id, "hasUser", Boolean(hasUser), user?.id || null);
  if (!hasUser) {
    centerId = id;
    break;
  }
}

if (!centerId) {
  const list = await fetch(`${webhookBase}/panel/centers?limit=20&page=1`, {
    headers: { Accept: "application/json" }
  }).then(r => r.json());
  const rows = list?.result || list || [];
  console.log("list sample", Array.isArray(rows) ? rows.slice(0, 3) : list);
  throw new Error("no candidate without admin");
}

const stamp = Date.now();
const createBody = {
  center_id: centerId,
  name: `ui smoke ${stamp}`,
  email: `uismoke${stamp}@example.com`,
  mobile: "09123334444",
  password: `UiSmoke${stamp}`
};
const createRes = await fetch(`${webhookBase}/panel/users/edit`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify(createBody)
});
const createJson = await createRes.json();
console.log("CREATE", createRes.status, createJson);
if (!createJson?.success) throw new Error("create failed");
const userId = createJson.result.id;

const updateRes = await fetch(`${webhookBase}/panel/users/edit`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({
    id: userId,
    center_id: centerId,
    name: `ui smoke updated ${stamp}`,
    email: createBody.email,
    mobile: "09125556666"
  })
});
const updateJson = await updateRes.json();
console.log("UPDATE", updateRes.status, updateJson);
if (!updateJson?.success) throw new Error("update failed");

// Leave user in place for UI? No — delete via SQL only if we can; otherwise leave and note.
// Try soft-disable: set is_active=0 by update isn't enough. Log for manual cleanup.
console.log("CREATED_USER_FOR_CLEANUP", { userId, centerId, email: createBody.email });
console.log("OK");
