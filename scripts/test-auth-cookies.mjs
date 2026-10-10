/**
 * Auth cookie domain scoping + public logout contract.
 *   node scripts/test-auth-cookies.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Keep in sync with SHARED_AUTH_COOKIE_DOMAINS in src/lib/authCookies.ts
const SHARED = [".darkube.ir", ".sayban.app"];

function authCookieDomainsForHost(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase();
  if (!host) return [undefined];
  for (const domain of SHARED) {
    const bare = domain.slice(1);
    if (host === bare || host.endsWith(domain)) {
      return [domain, undefined];
    }
  }
  return [undefined];
}

assert.deepEqual(authCookieDomainsForHost("sayban-test.darkube.ir"), [
  ".darkube.ir",
  undefined
]);
assert.deepEqual(authCookieDomainsForHost("web.sayban.app"), [
  ".sayban.app",
  undefined
]);
assert.deepEqual(authCookieDomainsForHost("sayban.app"), [
  ".sayban.app",
  undefined
]);
assert.deepEqual(authCookieDomainsForHost("localhost"), [undefined]);
assert.deepEqual(authCookieDomainsForHost("127.0.0.1"), [undefined]);
assert.deepEqual(authCookieDomainsForHost("evil-darkube.ir.example.com"), [
  undefined
]);

const cookiesSrc = fs.readFileSync(
  path.join(root, "src/lib/authCookies.ts"),
  "utf8"
);
assert.match(cookiesSrc, /\.sayban\.app/);
assert.match(cookiesSrc, /\.darkube\.ir/);
assert.match(cookiesSrc, /authCookieDomainsForHost/);

const gateSrc = fs.readFileSync(
  path.join(root, "src/lib/publicAuthGate.ts"),
  "utf8"
);
assert.match(gateSrc, /export function clearPublicSession/);
assert.match(gateSrc, /export function logoutPublic/);
assert.match(gateSrc, /clearGuestSession/);
assert.match(gateSrc, /deleteCookie\(PUBLIC_AUTH_COOKIE_NAME\)/);
assert.match(gateSrc, /location\.replace/);

const userSrc = fs.readFileSync(
  path.join(root, "components/User.tsx"),
  "utf8"
);
assert.match(userSrc, /logoutPublic/);
assert.match(userSrc, /button2/);

const welcome = fs.readFileSync(
  path.join(root, "components/LoginWelcome.tsx"),
  "utf8"
);
assert.match(welcome, /writeCookie/);
assert.doesNotMatch(welcome, /domain=\.darkube\.ir/);

const phone = fs.readFileSync(
  path.join(root, "components/auth/PhoneVerifyDialog.tsx"),
  "utf8"
);
assert.match(phone, /writeCookie/);
assert.doesNotMatch(phone, /domain=\.darkube\.ir/);

console.log("test-auth-cookies ok");
