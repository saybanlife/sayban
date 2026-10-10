import assert from "node:assert/strict";

function centerActiveStatusToastMessage(isActive) {
  return isActive
    ? "مرکز با موفقیت فعال شد"
    : "مرکز با موفقیت غیرفعال شد";
}

function isActiveStatusUpdateSuccess(res) {
  if (!res || typeof res !== "object") return false;
  if (typeof res.status === "number" && res.status >= 400) return false;
  return res.data?.success !== false;
}

assert.equal(centerActiveStatusToastMessage(true), "مرکز با موفقیت فعال شد");
assert.equal(centerActiveStatusToastMessage(false), "مرکز با موفقیت غیرفعال شد");
assert.equal(isActiveStatusUpdateSuccess({ status: 200, data: { success: true } }), true);
assert.equal(isActiveStatusUpdateSuccess({ status: 400, data: { success: true } }), false);
assert.equal(isActiveStatusUpdateSuccess({ status: 200, data: { success: false } }), false);

console.log("center active status toast tests passed");
