/**
 * Documents expected Home /search keyword matching after category+amenity patch.
 *   node scripts/test-search-category-amenities.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PATCH = fs.readFileSync(
  path.join(process.cwd(), "scripts/patch-n8n-search-category-amenities.mjs"),
  "utf8"
);

assert.match(PATCH, /cat\.name LIKE/);
assert.match(PATCH, /centers__amenities/);
assert.match(PATCH, /a\.name LIKE/);
assert.match(PATCH, /PATCHED_QUERY/);

console.log("search category+amenities patch contract ok");
