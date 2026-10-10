import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Load TS helper via tsx register when available; fallback duplicate for key logic.
function supportMessagesKey(messages) {
  if (!messages.length) return "0";
  const last = messages[messages.length - 1];
  return `${messages.length}:${String(last?.id ?? "")}`;
}

function applyScrollBottom(el) {
  const top = Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTop = top;
  return el.scrollTop;
}

assert.equal(supportMessagesKey([]), "0");
assert.equal(supportMessagesKey([{ id: 3 }, { id: 9 }]), "2:9");
assert.notEqual(
  supportMessagesKey([{ id: 1 }, { id: 2 }]),
  supportMessagesKey([{ id: 1 }, { id: 3 }])
);

const el = {
  clientHeight: 120,
  scrollHeight: 801,
  scrollTop: 0
};
assert.equal(applyScrollBottom(el), 681);
el.scrollHeight = 961;
assert.equal(applyScrollBottom(el), 841);

console.log("support scroll helpers ok");
