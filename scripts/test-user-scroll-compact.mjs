import assert from "node:assert/strict";

const SCROLL_COMPACT_ON = 36;
const SCROLL_COMPACT_OFF = 8;

function nextCompactState(compact, scrollY) {
  if (!compact && scrollY >= SCROLL_COMPACT_ON) return true;
  if (compact && scrollY <= SCROLL_COMPACT_OFF) return false;
  return compact;
}

assert.equal(nextCompactState(false, 0), false);
assert.equal(nextCompactState(false, SCROLL_COMPACT_ON - 1), false);
assert.equal(nextCompactState(false, SCROLL_COMPACT_ON), true);
assert.equal(nextCompactState(true, SCROLL_COMPACT_OFF + 1), true);
assert.equal(nextCompactState(true, SCROLL_COMPACT_OFF), false);
assert.equal(nextCompactState(true, 0), false);

console.log("user-scroll-compact: ok");
