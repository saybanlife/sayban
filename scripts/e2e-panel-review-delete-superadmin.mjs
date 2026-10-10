/**
 * E2E: super_admin deletes a center review via panel/reviews/delete.
 *   node scripts/e2e-panel-review-delete-superadmin.mjs
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const SECRET = "21232f297a57a5a743894a0e4a801fc3";
const PASS = "ReviewDelSA!2026";
const stamp = Date.now();
const EMAIL = `reviewdel_sa_${stamp}@sayban.test`;
const MOBILE = `09${String(stamp).slice(-9)}`;
const hash = crypto.createHmac("sha256", SECRET).update(PASS).digest("hex");

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
  return { status: res.status, data };
}

const centerRow = pma(
  "SELECT id FROM centers WHERE is_active = 1 ORDER BY id ASC LIMIT 1"
);
const centerId = Number(
  (centerRow.match(/\b(\d{1,6})\b/g) || []).find(
    n => Number(n) > 0 && Number(n) < 10000
  )
);
if (!Number.isFinite(centerId)) throw new Error("no center");

pma(
  `INSERT INTO panel__users (full_name, mobile, email, password, role, is_active, isnotif)
   VALUES ('ReviewDel SA', '${MOBILE}', '${EMAIL}', '${hash}', 'super_admin', 1, 1)`
);
pma(
  `INSERT INTO centers__reviews (center_id, user_id, rating, comment, created_at)
   VALUES (${centerId}, NULL, 4, 'نظر تست SA حذف ${stamp}', NOW())`
);
const reviewLookup = pma(
  `SELECT id, comment FROM centers__reviews WHERE comment LIKE '%${stamp}%' ORDER BY id DESC LIMIT 1`
);
const reviewId = Number((reviewLookup.match(/\b(\d+)\s+نظر تست/) || [])[1]);
if (!Number.isFinite(reviewId)) throw new Error("review insert failed");

const login = await json("/panel/user/login", {
  method: "POST",
  body: { userName: EMAIL, password: PASS }
});
const token = login.data?.result?.token;
if (!token) throw new Error("super_admin login failed");

const del = await json(PANEL_ROUTES.reviewsDelete, {
  method: "POST",
  token,
  body: { review_id: reviewId }
});
if (!del.data?.success) {
  throw new Error("delete failed: " + JSON.stringify(del.data));
}

const dbCheck = pma(
  `SELECT id, comment FROM centers__reviews WHERE id=${reviewId} LIMIT 1`
);
if (new RegExp(`\\b${reviewId}\\s+نظر تست`).test(dbCheck.text || dbCheck)) {
  throw new Error("review still in DB");
}

pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);
console.log("e2e-panel-review-delete-superadmin ok", { reviewId, centerId });
