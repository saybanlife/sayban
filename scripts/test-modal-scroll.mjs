/**
 * Panel Modal body must shrink inside the 90vh dialog so tall forms scroll.
 *
 *   node scripts/test-modal-scroll.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const css = fs.readFileSync(
  path.join(root, "components/Modal.module.css"),
  "utf8"
);
const tsx = fs.readFileSync(path.join(root, "components/Modal.tsx"), "utf8");

assert.match(css, /\.dialog\s*\{[^}]*overflow:\s*hidden/s);
assert.match(css, /\.dialog\s*\{[^}]*max-height:\s*min\(90vh/s);
assert.match(css, /\.body\s*\{[^}]*min-height:\s*0/s);
assert.match(css, /\.body\s*\{[^}]*overflow-y:\s*auto/s);
assert.match(css, /\.body\s*\{[^}]*flex:\s*1 1 auto/s);

const facts = fs.readFileSync(
  path.join(root, "components/centerPanel/CenterFactsPanels.tsx"),
  "utf8"
);
assert.match(facts, /PanelOptionSelect/);
assert.doesNotMatch(facts, /<select/);

assert.match(tsx, /from "\.\/Modal\.module\.css"/);
assert.match(tsx, /styles\.dialog/);
assert.match(tsx, /styles\.body/);
assert.match(tsx, /ariaDialog/);
assert.match(tsx, /scrollableContent/);
assert.match(tsx, /shouldCloseOnInteractOutside/);
assert.match(tsx, /shouldKeepModalOpenForTarget|SELECT/);
assert.match(tsx, /retainOpenDialog/);
assert.match(tsx, /getOpenDialogCount/);
assert.match(tsx, /data-radix-dialog-content/);
assert.match(tsx, /isInNestedDismissGrace/);

const picker = fs.readFileSync(
  path.join(root, "components/datetime/PanelTimePicker.tsx"),
  "utf8"
);
assert.match(picker, /disableModalHash/);

console.log("ok   modal scroll contract");
