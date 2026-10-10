/**
 * Smoke: normalizeHighRatedCenters filters/sorts real-shaped rows.
 *   node scripts/smoke-home-high-rated.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// TSX is compiled by Next; for smoke we re-implement the pure helper checks
// against the exported logic by dynamic import of the built path is heavy.
// Keep a mirrored pure check here that must stay in sync with the component.

function centerRating(row) {
  const numeric = Number(row?.rating_avg);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalize(payload, limit = 12) {
  const MIN_RATE = 4;
  const root = payload && typeof payload === "object" ? payload : {};
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(root.result)
      ? root.result
      : [];
  const mapped = rows
    .map(row => {
      const id = String(row?.id ?? "").trim();
      const name = String(row?.name ?? "").trim();
      const rating = centerRating(row);
      if (!id || !name || rating < MIN_RATE) return null;
      return { id, name, rating };
    })
    .filter(Boolean);
  mapped.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "fa"));
  return mapped.slice(0, limit);
}

const out = normalize({
  result: [
    { id: 1, name: "ب", rating_avg: 4.2 },
    { id: 2, name: "الف", rating_avg: 5 },
    { id: 3, name: "ج", rating_avg: 3.5 },
    { id: 4, name: "", rating_avg: 5 }
  ]
});

assert.equal(out.length, 2);
assert.equal(out[0].id, "2");
assert.equal(out[1].id, "1");
console.log("smoke-home-high-rated: ok");
