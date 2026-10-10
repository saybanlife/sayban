/**
 * Smoke: PlasmicMainLiad first-today reminder header card + scroll height.
 *   node scripts/smoke-reminder-header-date.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mainShell = fs.readFileSync(
  path.join(root, "components/MainLiad.tsx"),
  "utf8"
);
const plasmic = fs.readFileSync(
  path.join(root, "components/plasmic/sayban/PlasmicMainLiad.tsx"),
  "utf8"
);
const plasmicCss = fs.readFileSync(
  path.join(root, "components/plasmic/sayban/PlasmicMainLiad.module.css"),
  "utf8"
);
const card = fs.readFileSync(
  path.join(root, "components/MainLiadHeaderDate.tsx"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(root, "components/MainLiadHeaderDate.module.css"),
  "utf8"
);

assert.doesNotMatch(mainShell, /MainLiadHeaderDate|createPortal|dateBox/);
assert.match(mainShell, /PlasmicMainLiad root=\{\{ ref \}\}/);

assert.match(plasmic, /import MainLiadHeaderDate from/);
assert.match(plasmic, /<MainLiadHeaderDate/);
assert.match(plasmic, /reminders=\{/);
assert.match(plasmic, /\$state\.remind/);

assert.match(card, /nextCompactState/);
assert.match(card, /data-compact/);
assert.match(card, /pickFirstTodayReminder/);
assert.match(card, /--reminder-header-height/);
assert.match(card, /EXPANDED_HEADER_PX/);
assert.match(card, /یادآوری‌ها/);
assert.match(card, /onSettingsClick/);
assert.match(card, /ویرایش و تنظیمات/);
assert.doesNotMatch(card, /disabled=\{reminderCount/);
assert.match(plasmic, /onSettingsClick=\{/);

assert.match(css, /translate\(-50%, 48%\)/);
assert.match(css, /box-shadow/);
assert.match(css, /\.wrap\[data-compact="1"\] \.card/);
assert.match(css, /\.digit\b/);
assert.match(css, /\.pageTitle/);
assert.match(css, /\.settingsBtn/);

assert.match(plasmicCss, /--reminder-header-height/);
assert.match(plasmicCss, /padding-top 0\.38s/);

console.log("PASS smoke-reminder-header-date");
