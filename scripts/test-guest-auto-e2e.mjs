/**
 * Live API + contract checks for auto-guest / native / upgrade paths.
 *   node scripts/test-guest-auto-e2e.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://sayban.darkube.ir/webhook/";

async function postJson(route, body, headers = {}) {
  const res = await fetch(new URL(route, API), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

function decodeId(token) {
  const part = String(token || "").split(".")[1];
  const padded = part.replace(/-/g, "+").replace(/_/g, "/");
  return Number(JSON.parse(Buffer.from(padded, "base64").toString("utf8")).id);
}

// --- static contracts ---
const login = fs.readFileSync(path.join(root, "components/Login.tsx"), "utf8");
assert.match(login, /createDefaultGuestSession/);
assert.match(login, /isSaybanNativeAndroid/);
assert.doesNotMatch(login, /LoginWelcome/);
assert.match(login, /finalizeGuestPhoneUpgrade/);

const user = fs.readFileSync(path.join(root, "components/User.tsx"), "utf8");
assert.match(user, /ساخت حساب کاربری/);

const gate = fs.readFileSync(path.join(root, "src/lib/publicAuthGate.ts"), "utf8");
assert.doesNotMatch(gate, /"user",\s*"mainLiad"/);

// --- live: create default guest ---
const guest = await postJson("users/guest", { name: "کاربر مهمان" });
assert.equal(guest.res.status, 200, "users/guest status");
assert.equal(guest.json?.success, true, "users/guest success");
const guestToken = String(guest.json?.data?.token || "");
assert.ok(guestToken.includes("."), "guest jwt");
const guestId = decodeId(guestToken);
assert.ok(Number.isFinite(guestId), "guest id");
console.log("guest ok id=", guestId);

// --- live: retire guest (cleanup + verify retire endpoint) ---
const retire = await postJson(
  "users/guest/retire",
  { id: guestId },
  { Authorization: `Bearer ${guestToken}` }
);
assert.equal(retire.res.status, 200, "retire status");
assert.equal(retire.json?.success, true, "retire success");
console.log("retire ok");

console.log("guest-auto-e2e OK");
