/**
 * Self-test for center registration review helpers.
 *   node src/lib/centerApproval.selftest.mjs
 */
import assert from "node:assert/strict";

// Mirror the pure helpers without TS path aliases.
function normalizeApprovalStatus(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "approved" || raw === "rejected" || raw === "pending") return raw;
  return "pending";
}

function normalizeRegistrationDossier(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const images = [];
  if (Array.isArray(raw.images)) {
    for (const item of raw.images) {
      if (typeof item === "string" && item.trim()) images.push(item.trim());
    }
  }
  return {
    id,
    approval_status: normalizeApprovalStatus(raw.approval_status),
    account_is_active:
      raw.account_is_active == null || raw.account_is_active === ""
        ? null
        : Number(raw.account_is_active) === 1
          ? 1
          : 0,
    images
  };
}

assert.equal(normalizeApprovalStatus("APPROVED"), "approved");
assert.equal(normalizeApprovalStatus("nope"), "pending");

const dossier = normalizeRegistrationDossier({
  id: 151,
  approval_status: "pending",
  account_is_active: 0,
  images: ["https://example.com/a.jpg", ""]
});
assert.equal(dossier.id, 151);
assert.equal(dossier.approval_status, "pending");
assert.equal(dossier.account_is_active, 0);
assert.deepEqual(dossier.images, ["https://example.com/a.jpg"]);
assert.equal(normalizeRegistrationDossier(null), null);

console.log("centerApproval.selftest: ok");
