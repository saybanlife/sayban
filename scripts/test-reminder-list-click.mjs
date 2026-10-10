import assert from "node:assert/strict";
import {
  toReminderEditPageSelect
} from "../src/lib/reminderTask.ts";

assert.equal(toReminderEditPageSelect(null), null);
assert.deepEqual(toReminderEditPageSelect({ id: 7, name: "آزمایش", add: true }), {
  id: 7,
  name: "آزمایش"
});
assert.equal(
  Object.prototype.hasOwnProperty.call(
    toReminderEditPageSelect({ id: 1, add: true }),
    "add"
  ),
  false
);

console.log("reminder list click helpers passed");
