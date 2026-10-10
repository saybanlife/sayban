/**
 * Exercises src/lib/persistentApiCache.ts against a localStorage stub.
 *
 * Usage:
 *   npx tsc src/lib/persistentApiCache.ts --outDir .tmp-cache-test --module commonjs --target es2019
 *   node scripts/test-persistent-api-cache.mjs
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Minimal localStorage stub, installed before the module is loaded.
const store = new Map();
globalThis.window = {
  localStorage: {
    get length() {
      return store.size;
    },
    key: i => Array.from(store.keys())[i] ?? null,
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  }
};

const cache = require("../.tmp-cache-test/persistentApiCache.js");
const KEY = "categories-full";
const payload = { result: [{ slug: "care", name: "مراقبت" }] };

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

check("miss on empty cache", () => {
  assert.equal(cache.readApiCache(KEY), null);
});

check("round-trips a payload and reports it fresh", () => {
  cache.writeApiCache(KEY, payload);
  const entry = cache.readApiCache(KEY);
  assert.deepEqual(entry.data, payload);
  assert.equal(entry.stale, false);
});

check("marks the entry stale once past its TTL", () => {
  // ttl of 0 means anything with a non-zero age is stale.
  const entry = cache.readApiCache(KEY, 0);
  assert.equal(entry.stale, true);
  assert.deepEqual(entry.data, payload, "stale entries still return data");
});

check("treats a backwards clock as stale rather than fresh", () => {
  const raw = JSON.parse(store.get("sayban:apicache:v1:" + KEY));
  raw.storedAt = Date.now() + 60_000;
  store.set("sayban:apicache:v1:" + KEY, JSON.stringify(raw));
  assert.equal(cache.readApiCache(KEY).stale, true);
});

check("drops a corrupt entry instead of throwing", () => {
  store.set("sayban:apicache:v1:" + KEY, "{not json");
  assert.equal(cache.readApiCache(KEY), null);
  assert.equal(store.has("sayban:apicache:v1:" + KEY), false);
});

check("ignores undefined payloads", () => {
  cache.writeApiCache(KEY, undefined);
  assert.equal(cache.readApiCache(KEY), null);
});

check("namespaces keys and clears only its own", () => {
  cache.writeApiCache(KEY, payload);
  store.set("unrelated-key", "keep me");
  assert.ok(store.has("sayban:apicache:v1:" + KEY));
  cache.clearApiCache();
  assert.equal(cache.readApiCache(KEY), null);
  assert.equal(store.get("unrelated-key"), "keep me");
});

check("survives a throwing storage (private mode)", () => {
  const original = globalThis.window.localStorage.setItem;
  globalThis.window.localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  cache.writeApiCache(KEY, payload); // must not throw
  globalThis.window.localStorage.setItem = original;
  assert.equal(cache.readApiCache(KEY), null);
});

console.log(`\n${passed} checks passed`);
