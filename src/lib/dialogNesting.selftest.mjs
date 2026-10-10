/**
 * Run: node src/lib/dialogNesting.selftest.mjs
 */
import assert from "node:assert/strict";

const stack = [];
let nestedDismissGraceUntil = 0;

function getOpenDialogCount() {
  return stack.length;
}

function isInNestedDismissGrace() {
  return Date.now() < nestedDismissGraceUntil;
}

function retainOpenDialog() {
  const id = Symbol("sayban-dialog");
  stack.push(id);
  let released = false;
  return {
    isTopmost: () => !released && stack[stack.length - 1] === id,
    release: () => {
      if (released) return;
      released = true;
      const index = stack.lastIndexOf(id);
      if (index < 0) return;
      const wasNested = stack.length > 1;
      stack.splice(index, 1);
      if (wasNested) nestedDismissGraceUntil = Date.now() + 220;
    }
  };
}

const MODAL_HASH_PREFIX = "modal-";
function buildModalHash(modalId) {
  return `#${MODAL_HASH_PREFIX}${modalId}`;
}
function parseModalHash(hash) {
  const prefix = `#${MODAL_HASH_PREFIX}`;
  if (!hash.startsWith(prefix)) return null;
  const id = hash.slice(prefix.length);
  return id.length > 0 ? id : null;
}

assert.equal(getOpenDialogCount(), 0);
const parent = retainOpenDialog();
assert.equal(parent.isTopmost(), true);
const child = retainOpenDialog();
assert.equal(getOpenDialogCount(), 2);
assert.equal(parent.isTopmost(), false);
assert.equal(child.isTopmost(), true);
child.release();
assert.equal(parent.isTopmost(), true);
assert.equal(isInNestedDismissGrace(), true);
parent.release();
assert.equal(getOpenDialogCount(), 0);

const once = retainOpenDialog();
once.release();
once.release();
assert.equal(getOpenDialogCount(), 0);

assert.equal(buildModalHash("date"), "#modal-date");
assert.equal(parseModalHash("#modal-date"), "date");
assert.equal(parseModalHash("#other"), null);
assert.equal(parseModalHash("#modal-"), null);

console.log("dialogNesting.selftest: ok");
