/**
 * Public JWT validity helpers.
 *   node scripts/test-public-auth-token.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(
  path.join(root, "src/lib/publicAuthToken.ts"),
  "utf8"
);

assert.match(src, /expireNum > 1e12 \? expireNum : expireNum \* 1000/);

function isExpireValid(expireNum) {
  if (!Number.isFinite(expireNum)) return false;
  const expireMs = expireNum > 1e12 ? expireNum : expireNum * 1000;
  return expireMs > Date.now();
}

assert.equal(isExpireValid(Math.floor(Date.now() / 1000) + 3600), true);
assert.equal(isExpireValid(Date.now() + 3600_000), true);
assert.equal(isExpireValid(Math.floor(Date.now() / 1000) - 10), false);
assert.equal(isExpireValid(NaN), false);

console.log("public-auth-token tests OK");
