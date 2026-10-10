/**
 * Smoke checks for non-wheel date/time fields helpers.
 *   node src/lib/simplePickerFields.selftest.mjs
 */
import assert from "node:assert/strict";
import Jalaali from "jalaali-js";

function fromJalali(jy, jm, jd) {
  const { gy, gm, gd } = Jalaali.toGregorian(jy, jm, jd);
  const pad = n => String(n).padStart(2, "0");
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

const sample = fromJalali(1404, 6, 18);
assert.match(sample, /^\d{4}-\d{2}-\d{2}$/);

const back = Jalaali.toJalaali(
  Number(sample.slice(0, 4)),
  Number(sample.slice(5, 7)),
  Number(sample.slice(8, 10))
);
assert.equal(back.jy, 1404);
assert.equal(back.jm, 6);
assert.equal(back.jd, 18);

console.log("simplePickerFields.selftest: ok");
