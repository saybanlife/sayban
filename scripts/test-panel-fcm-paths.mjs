import assert from "node:assert/strict";

function isPanelAppPath(pathname = "") {
  const path = pathname.split("?")[0] || "";
  if (!path.startsWith("/panel")) return false;
  if (
    path.startsWith("/panel/login") ||
    path.startsWith("/panel/create") ||
    path.startsWith("/panel/plasmic-host")
  ) {
    return false;
  }
  return true;
}

assert.equal(isPanelAppPath("/panel"), true);
assert.equal(isPanelAppPath("/panel/centers"), true);
assert.equal(isPanelAppPath("/panel/login"), false);
assert.equal(isPanelAppPath("/panel/create"), false);
assert.equal(isPanelAppPath("/home/"), false);

console.log("panel fcm path helpers ok");
