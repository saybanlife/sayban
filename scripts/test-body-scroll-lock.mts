/**
 * Nested body scroll locks must not leave overflow:hidden after the last unlock.
 *   node --import tsx scripts/test-body-scroll-lock.mts
 */
import assert from "node:assert/strict";

const attrs = new Map<string, string>();
const body = {
  style: { overflow: "" } as { overflow: string },
  setAttribute(name: string, value: string) {
    attrs.set(name, value);
  },
  removeAttribute(name: string) {
    attrs.delete(name);
  },
  getAttribute(name: string) {
    return attrs.has(name) ? attrs.get(name)! : null;
  }
};

(globalThis as { document?: { body: typeof body } }).document = { body };

const {
  getBodyScrollLockCount,
  lockBodyScroll,
  resetBodyScrollLockForTests
} = await import("../src/lib/bodyScrollLock");

resetBodyScrollLockForTests();
body.style.overflow = "";

const unlockA = lockBodyScroll();
assert.equal(body.style.overflow, "hidden");
assert.equal(getBodyScrollLockCount(), 1);
assert.equal(body.getAttribute("data-sayban-scroll-lock"), "true");

const unlockB = lockBodyScroll();
assert.equal(getBodyScrollLockCount(), 2);
assert.equal(body.style.overflow, "hidden");

unlockA();
assert.equal(getBodyScrollLockCount(), 1);
assert.equal(body.style.overflow, "hidden");

unlockB();
assert.equal(getBodyScrollLockCount(), 0);
assert.equal(body.style.overflow, "");
assert.equal(body.getAttribute("data-sayban-scroll-lock"), null);

unlockB();
assert.equal(getBodyScrollLockCount(), 0);

resetBodyScrollLockForTests();
const first = lockBodyScroll();
const second = lockBodyScroll();
first();
second();
assert.equal(body.style.overflow, "");

console.log("body-scroll-lock: ok");
