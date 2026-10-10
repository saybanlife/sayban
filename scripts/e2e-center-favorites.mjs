/**
 * E2E: favorites toggle + list + status for the public user OTP account.
 *   node scripts/e2e-center-favorites.mjs
 */
import { spawnSync } from "node:child_process";
import { PUBLIC_ROUTES, resolveApiUrl } from "../src/lib/apiRoutes.ts";

const MOBILE = "09228951264";
const CENTER_ID = Number(process.env.CENTER_ID || 171);

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  const j = JSON.parse(out);
  if (j.success === false) throw new Error(j.error || "pma error");
  return j.text || "";
}

function readOtp(text) {
  const m = String(text).match(/09228951264\s+(\d{4,6})\s+/);
  return m?.[1] || null;
}

async function loginJwt() {
  const authRes = await fetch(resolveApiUrl("users/auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  if (!authRes.ok) throw new Error(`auth ${authRes.status}`);
  await new Promise(r => setTimeout(r, 1500));
  const text = pma(
    `SELECT mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
  );
  const otp = readOtp(text);
  if (!otp) throw new Error("OTP not found");
  const valRes = await fetch(resolveApiUrl("/users/validate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE, code: otp })
  });
  const valJson = await valRes.json();
  const jwt = valJson?.data?.token || valJson?.token || valJson?.result?.token;
  if (!jwt) throw new Error("JWT missing");
  return jwt;
}

async function api(path, { method = "GET", token, body, query } = {}) {
  const url = new URL(resolveApiUrl(path));
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Accept: "application/json",
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
    data = { raw: text.slice(0, 300) };
  }
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

pma(`DELETE FROM users__center_favorites WHERE center_id=${CENTER_ID}`);

const anon = await api(PUBLIC_ROUTES.favorites);
console.log("anon list", anon.status);
assert(anon.status === 401 || anon.status === 403, `anon should be unauthorized, got ${anon.status}`);

const token = await loginJwt();
console.log("login ok");

const on = await api(PUBLIC_ROUTES.favoritesToggle, {
  method: "POST",
  token,
  body: { center_id: CENTER_ID }
});
console.log("toggle on", on.status, on.data);
assert(on.status === 200 && on.data?.favorited === true, "expected favorited true");

const statusOn = await api(PUBLIC_ROUTES.favoritesStatus, {
  token,
  query: { center_id: CENTER_ID }
});
console.log("status on", statusOn.status, statusOn.data);
assert(statusOn.data?.favorited === true, "status should be favorited");

const listOn = await api(PUBLIC_ROUTES.favorites, { token });
const ids = (listOn.data?.result || []).map(row => Number(row.id));
console.log("list ids", ids);
assert(ids.includes(CENTER_ID), "list missing center");

const off = await api(PUBLIC_ROUTES.favoritesToggle, {
  method: "POST",
  token,
  body: { center_id: CENTER_ID }
});
console.log("toggle off", off.status, off.data);
assert(off.status === 200 && off.data?.favorited === false, "expected favorited false");

const listOff = await api(PUBLIC_ROUTES.favorites, { token });
const idsOff = (listOff.data?.result || []).map(row => Number(row.id));
assert(!idsOff.includes(CENTER_ID), "center still listed after remove");

console.log("E2E favorites PASS");
