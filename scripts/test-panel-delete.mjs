/**
 * Smoke tests for panel delete endpoints (reviews + users).
 * Requires n8n patches applied and valid tokens in env or args.
 *
 *   node scripts/test-panel-delete.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { PANEL_ROUTES, resolveApiUrl } from "../src/lib/apiRoutes.ts";
import { panelUserDeleteTarget } from "../components/panel/panelUsersApi.ts";
import { resolveCenterReviewId } from "../components/centerPage/centerHelpers.ts";

assert.equal(
  panelUserDeleteTarget({ id: 5, نام: "تست" })?.id,
  5,
  "panelUserDeleteTarget prefers id"
);
assert.equal(
  panelUserDeleteTarget({ شناسه: 7, نام: "الف" })?.id,
  7,
  "panelUserDeleteTarget accepts شناسه"
);

// Panel center page returns `review_id`, not `id` — delete used to no-op.
assert.equal(resolveCenterReviewId({ review_id: 42 }), 42);
assert.equal(resolveCenterReviewId({ id: 9, review_id: 42 }), 9);
assert.equal(resolveCenterReviewId({ id: "0" }), 0);
assert.equal(resolveCenterReviewId({}), 0);
assert.equal(resolveCenterReviewId(null), 0);

const env = Object.fromEntries(
  fs
    .readFileSync(".cursor/sayban-ops/secrets/n8n_sayban.env", "utf8")
    .split(/\r?\n/)
    .filter(l => l.trim() && !l.startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

async function post(path, body, token) {
  const res = await fetch(resolveApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// Unauthenticated delete must not succeed once patched.
const unauthUser = await post(PANEL_ROUTES.usersDelete, { id: 1 });
assert.notEqual(
  unauthUser.data?.success,
  true,
  "users/delete without token should not succeed"
);

const unauthReview = await post(PANEL_ROUTES.reviewsDelete, { review_id: 1 });
assert.notEqual(
  unauthReview.data?.success,
  true,
  "reviews/delete without token should not succeed"
);

console.log("test-panel-delete ok");
