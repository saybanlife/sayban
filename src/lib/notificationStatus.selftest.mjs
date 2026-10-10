/**
 * Minimal selftest for native-aware notification gate helpers.
 * Run: node --experimental-vm-modules src/lib/notificationStatus.selftest.mjs
 */
import assert from "node:assert/strict";

function asNotificationPreference(value) {
  return value === true || value === 1 || value === "1";
}

function resolveGate({ native, enabled, permission, browserPermission }) {
  if (native) {
    if (enabled || permission === "granted") return "active";
    if (permission === "denied") return "blocked";
    return "not_asked";
  }
  if (!browserPermission) return "not_supported";
  if (browserPermission === "granted") return "active";
  if (browserPermission === "denied") return "blocked";
  return "not_asked";
}

function switchOn({ native, enabled, browserPermission, isnotif }) {
  if (native) {
    if (!enabled) return false;
    return asNotificationPreference(isnotif);
  }
  if (browserPermission !== "granted") return false;
  return asNotificationPreference(isnotif);
}

assert.equal(
  resolveGate({ native: true, enabled: true, permission: "granted" }),
  "active"
);
assert.equal(
  resolveGate({ native: true, enabled: false, permission: "default" }),
  "not_asked"
);
assert.equal(
  resolveGate({ native: true, enabled: false, permission: "denied" }),
  "blocked"
);
assert.equal(
  resolveGate({ native: false, browserPermission: "granted" }),
  "active"
);
assert.equal(
  switchOn({ native: true, enabled: true, isnotif: 1 }),
  true
);
assert.equal(
  switchOn({ native: true, enabled: true, isnotif: 0 }),
  false
);
assert.equal(
  switchOn({ native: true, enabled: false, isnotif: 1 }),
  false
);
assert.equal(
  switchOn({
    native: false,
    browserPermission: "default",
    isnotif: 1
  }),
  false
);

console.log("notificationStatus.selftest OK");
