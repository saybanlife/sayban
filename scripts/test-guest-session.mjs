/**
 * Guest entry: auto guest outside app, mobile OTP inside native, no name UI.
 *   node scripts/test-guest-session.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(String(k), String(v)),
    removeItem: (k) => map.delete(String(k))
  };
}

const localStorage = makeStorage();
const sessionStorage = makeStorage();
const GUEST_KEY = "sayban_guest_session";
const RETURN_KEY = "sayban_auth_return";

function normalizeGuestName(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

assert.equal(normalizeGuestName("  علی   رضایی "), "علی رضایی");
const session = { name: normalizeGuestName("  مریم "), createdAt: Date.now() };
localStorage.setItem(GUEST_KEY, JSON.stringify(session));
assert.equal(JSON.parse(localStorage.getItem(GUEST_KEY)).name, "مریم");
sessionStorage.setItem(RETURN_KEY, "/home/center/9");
assert.equal(sessionStorage.getItem(RETURN_KEY), "/home/center/9");

const login = fs.readFileSync(path.join(root, "components/Login.tsx"), "utf8");
assert.doesNotMatch(login, /LoginWelcome/);
assert.match(login, /PlasmicLogin/);
assert.match(login, /createDefaultGuestSession/);
assert.match(login, /isSaybanNativeAndroid/);
assert.match(login, /\/login\/mobile/);
assert.match(login, /DEFAULT_GUEST_NAME/);
assert.doesNotMatch(login, /users\/auth|users\/validate/);

assert.ok(!fs.existsSync(path.join(root, "components/LoginWelcome.tsx")));

const guestAccount = fs.readFileSync(
  path.join(root, "src/lib/guestAccount.ts"),
  "utf8"
);
assert.match(guestAccount, /DEFAULT_GUEST_NAME/);
assert.match(guestAccount, /createDefaultGuestSession/);
assert.match(guestAccount, /finalizeGuestPhoneUpgrade/);
assert.match(guestAccount, /usersGuest|users\/guest/);

const plasmicLogin = fs.readFileSync(
  path.join(root, "components/plasmic/sayban/PlasmicLogin.tsx"),
  "utf8"
);
assert.match(plasmicLogin, /users\/auth/);
assert.match(plasmicLogin, /\/users\/validate/);

const gate = fs.readFileSync(path.join(root, "src/lib/publicAuthGate.ts"), "utf8");
assert.match(gate, /hasPhoneVerifiedPublicAuth/);
assert.match(gate, /registerPhoneVerifyOpener|PhoneVerifyOpenRequest/);
assert.doesNotMatch(gate, /location\.assign\("\/login\/mobile"\)/);
assert.doesNotMatch(
  gate,
  /"notif",\s*"user",\s*"mainLiad"/
);

const user = fs.readFileSync(path.join(root, "components/User.tsx"), "utf8");
assert.match(user, /ساخت حساب کاربری/);
assert.match(user, /isGuestOnly/);
assert.match(user, /\/login\/mobile/);
assert.match(user, /logoutPublic/);

const dialog = fs.readFileSync(
  path.join(root, "components/auth/PhoneVerifyDialog.tsx"),
  "utf8"
);
assert.match(dialog, /users\/auth/);
assert.match(dialog, /otp-wrapper|otp-input/);
assert.match(dialog, /finalizeGuestPhoneUpgrade/);
assert.match(dialog, /reloadWithFreshProfile/);
assert.match(dialog, /قبلاً حساب داشته‌اید/);

assert.match(
  fs.readFileSync(path.join(root, "src/fragment/fragment.tsx"), "utf8"),
  /PhoneVerifyDialog/
);
assert.match(
  fs.readFileSync(path.join(root, "src/lib/publicAuthToken.ts"), "utf8"),
  /isPublicAuthTokenValid/
);
assert.match(
  fs.readFileSync(path.join(root, "components/Homepage.tsx"), "utf8"),
  /replace\("\/login"\)/
);

console.log("guest-session tests OK");
