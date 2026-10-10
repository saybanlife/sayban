/**
 * E2E: create app user → delete via panel API → verify removed from list.
 *
 *   node scripts/e2e-panel-user-delete.mjs
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const SECRET = "21232f297a57a5a743894a0e4a801fc3";
const ADMIN_PASS = "UserDelE2E!2026";
const stamp = Date.now();
const ADMIN_EMAIL = `userdel_admin_${stamp}@sayban.test`;
const ADMIN_MOBILE = `09${String(stamp).slice(-9)}`;
const USER_MOBILE = `09${String(stamp + 1).slice(-9)}`;
const adminHash = crypto.createHmac("sha256", SECRET).update(ADMIN_PASS).digest("hex");

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  if (r.status !== 0 || out.includes('"success": false')) {
    throw new Error(out.slice(0, 800) || r.stderr);
  }
  return out;
}

async function json(path, { method = "GET", token, body } = {}) {
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

pma(
  `INSERT INTO panel__users (full_name, mobile, email, password, role, is_active, isnotif)
   VALUES ('UserDel E2E', '${ADMIN_MOBILE}', '${ADMIN_EMAIL}', '${adminHash}', 'super_admin', 1, 1)`
);

pma(
  `INSERT INTO users (name, refCode, mobile, active, createdAt, updatedAt, isnotif)
   VALUES ('کاربر حذف E2E', 'DEL${stamp}', '${USER_MOBILE}', 1, NOW(), NOW(), 1)`
);

const lookup = pma(
  `SELECT id, mobile FROM users WHERE mobile='${USER_MOBILE}' LIMIT 1`
);
const userId = Number(
  (lookup.match(new RegExp(`(\\d+)\\s+${USER_MOBILE}`)) || [])[1]
);
if (!Number.isFinite(userId)) throw new Error("failed to create test user");

const login = await json("panel/user/login", {
  method: "POST",
  body: { userName: ADMIN_EMAIL, password: ADMIN_PASS }
});
const token = login.data?.result?.token;
if (!token) throw new Error("admin login failed");

const before = await json("/panel/users?active=1&page=1&limit=50");
const listedBefore = (before.data?.result || []).some(
  u => Number(u.id) === userId
);
if (!listedBefore) throw new Error("test user missing from list before delete");

const del = await json(PANEL_ROUTES.usersDelete, {
  method: "POST",
  token,
  body: { id: userId }
});
if (!del.data?.success) {
  throw new Error(
    "delete failed: " +
      JSON.stringify({ status: del.status, data: del.data, userId })
  );
}

const after = await json("/panel/users?active=1&page=1&limit=50");
const listedAfter = (after.data?.result || []).some(u => Number(u.id) === userId);
if (listedAfter) throw new Error("user still in list after delete");

const dbCheck = pma(
  `SELECT id, mobile FROM users WHERE id=${userId} LIMIT 1`
);
if (
  new RegExp(`\\b${userId}\\s+${USER_MOBILE}\\b`).test(dbCheck.text || "")
) {
  throw new Error("user still in DB after delete");
}

pma(`DELETE FROM panel__users WHERE email='${ADMIN_EMAIL}'`);
console.log("e2e-panel-user-delete ok", { userId });
