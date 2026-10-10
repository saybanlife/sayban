import assert from "node:assert/strict";
import fs from "node:fs";
import {
  addressAnswerId,
  isSameAddressAnswer,
  toAddressAnswer,
  findNewAddressId
} from "../components/questions/addressQuestionModel.ts";

const addr = {
  id: 12,
  title: "خانه مادربزرگ",
  city: "تهران",
  address: "ونک، خیابان ملاصدرا"
};

assert.equal(addressAnswerId({ id: 12 }), 12);
assert.equal(addressAnswerId("x"), null);
assert.equal(isSameAddressAnswer({ id: 12 }, addr), true);
assert.equal(
  isSameAddressAnswer(
    { city: "تهران", address: "ونک، خیابان ملاصدرا" },
    addr
  ),
  true
);
assert.deepEqual(toAddressAnswer(addr).title, "خانه مادربزرگ");

assert.equal(
  findNewAddressId(
    [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
      { id: 9, title: "new" }
    ],
    [1, 2]
  ),
  9
);
assert.equal(
  findNewAddressId([{ id: 1, title: "a" }], [1]),
  null
);

const answers = fs.readFileSync(
  new URL("../components/AnswersUser.tsx", import.meta.url),
  "utf8"
);
assert.match(answers, /type === "address"/);
assert.match(answers, /آدرس جدید \+/);
assert.match(answers, /buildAddAddressDestination/);
assert.match(answers, /rememberAddressDialogReturn/);
assert.match(answers, /AddressQuestionField/);

const css = fs.readFileSync(
  new URL("../components/AnswersUser.module.css", import.meta.url),
  "utf8"
);
assert.match(css, /\.addressCardSelected/);
assert.match(css, /\.addressAdd/);
assert.match(css, /dashed/);

console.log("address question UI checks passed");
