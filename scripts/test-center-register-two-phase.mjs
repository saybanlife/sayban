/**
 * Contract checks for two-phase center registration client helpers.
 *   node scripts/test-center-register-two-phase.mjs
 */
import assert from "node:assert/strict";
import { PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

assert.equal(PANEL_ROUTES.userRegister, "/panel/user/register");
assert.equal(
  PANEL_ROUTES.userRegisterComplete,
  "/panel/user/register/complete"
);

function extractCenterId(data) {
  const result = data?.result;
  if (!result || Array.isArray(result) || typeof result !== "object") return null;
  const id = Number(result.center_id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

assert.equal(extractCenterId({ success: true, result: { center_id: 42 } }), 42);
assert.equal(extractCenterId({ success: true, result: { center_id: "0" } }), null);
assert.equal(extractCenterId({ success: true, result: {} }), null);

console.log("center register two-phase contract ok");
