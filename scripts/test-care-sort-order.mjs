/**
 * Care/treatment sort_order contracts (panel DnD + public Center page).
 *   node scripts/test-care-sort-order.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sql = fs.readFileSync(
  path.join(root, "scripts/sql/center_care_sort_order.sql"),
  "utf8"
);
assert.match(sql, /centers__care_item_values/);
assert.match(sql, /centers__specialists/);
assert.match(sql, /sort_order/);
assert.ok(
  fs.existsSync(path.join(root, "scripts/sql/center_care_sort_order_rollback.sql"))
);

const patch = fs.readFileSync(
  path.join(root, "scripts/patch-n8n-care-sort-order.mjs"),
  "utf8"
);
assert.match(patch, /COALESCE\(v\.sort_order/);
assert.match(patch, /ORDER BY sort_order ASC/);
assert.match(patch, /sort_order = VALUES\(sort_order\)/);

const manager = fs.readFileSync(
  path.join(root, "components/centerPanel/CenterCareItemsManager.tsx"),
  "utf8"
);
assert.match(manager, /draggable/);
assert.match(manager, /persistFacilityOrder/);
assert.match(manager, /persistServiceOrder/);
assert.match(manager, /sort_order/);

const fields = fs.readFileSync(
  path.join(root, "components/centerPage/centerProfileFields.ts"),
  "utf8"
);
assert.match(fields, /Number\.isFinite\(dbOrder\)/);
assert.match(fields, /item\.sort_order/);

const api = fs.readFileSync(
  path.join(root, "components/centerPanel/panelApi.ts"),
  "utf8"
);
assert.match(api, /sort_order\?: number/);

console.log("test-care-sort-order ok");
