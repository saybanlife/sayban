/**
 * Create a temporary super_admin, exercise list/add/delete via API,
 * print a short browser-ready summary, then delete the user.
 *
 *   node scripts/e2e-panel-tags.mjs
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const SECRET = "21232f297a57a5a743894a0e4a801fc3";
const PASS = "TagsE2E!2026";
const stamp = Date.now();
const EMAIL = `tags_e2e_${stamp}@sayban.test`;
const MOBILE = `09${String(stamp).slice(-9)}`;
const hash = crypto.createHmac("sha256", SECRET).update(PASS).digest("hex");

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  if (r.status !== 0 || out.includes('"success": false')) {
    throw new Error(out.slice(0, 500) || r.stderr);
  }
  return out;
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function json(path, { method = "GET", token, body } = {}) {
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

pma(
  `INSERT INTO panel__users (full_name, mobile, email, password, role, is_active, isnotif)
   VALUES ('Tags E2E', '${MOBILE}', '${EMAIL}', '${hash}', 'super_admin', 1, 1)`
);

const login = await json("panel/user/login", {
  method: "POST",
  body: { userName: EMAIL, password: PASS }
});
const token = login.data?.result?.token;
if (!token) {
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("login failed: " + JSON.stringify(login.data));
}

const before = await json(PANEL_ROUTES.tags, { token });
if (!before.data?.success) {
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("list failed");
}

const name = `تگ پنل ${stamp}`;
const slug = `panel-tag-${stamp}`;
const add = await json(PANEL_ROUTES.tagsAdd, {
  method: "POST",
  token,
  body: { name, slug, description: "e2e" }
});
const id = Number(add.data?.result?.id);
if (!add.data?.success || !Number.isFinite(id)) {
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("add failed: " + JSON.stringify(add.data));
}

const listed = await json(PANEL_ROUTES.tags, { token });
const found = (listed.data?.result || []).find(t => Number(t.id) === id);
if (!found || found.name !== name) {
  pma(`DELETE FROM tags WHERE id=${id}`);
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("added tag missing from list");
}

const del = await json(PANEL_ROUTES.tagsDelete, {
  method: "POST",
  token,
  body: { id }
});
if (!del.data?.success) {
  pma(`DELETE FROM tags WHERE id=${id}`);
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("delete failed: " + JSON.stringify(del.data));
}

const after = await json(PANEL_ROUTES.tags, { token });
const still = (after.data?.result || []).find(t => Number(t.id) === id);
if (still) {
  pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
  throw new Error("tag still present after delete");
}

pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);

console.log(
  JSON.stringify(
    {
      ok: true,
      listCount: (after.data?.result || []).length,
      addedId: id,
      name,
      slug
    },
    null,
    2
  )
);
