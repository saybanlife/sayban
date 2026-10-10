/**
 * Ensures panel support keeps an open conversation live via polling
 * (same cadence idea as public SupportChat).
 *
 *   node scripts/test-panel-support-poll.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "components",
  "MainPageSupport.tsx"
);
const source = fs.readFileSync(file, "utf8");

assert.match(
  source,
  /PANEL_SUPPORT_MESSAGES_POLL_MS\s*=\s*12_?000/,
  "panel support must poll open chat every 12s"
);
assert.match(
  source,
  /setInterval\(tick,\s*PANEL_SUPPORT_MESSAGES_POLL_MS\)/,
  "open conversation must schedule silent message polls"
);
assert.match(
  source,
  /loadMessages\(selectedId,\s*\{\s*silent:\s*true\s*\}\)/,
  "polls must be silent to avoid toast/loading flicker"
);
assert.match(
  source,
  /document\.hidden/,
  "polling should pause while the tab is hidden"
);

console.log("panel support open-chat poll ok");
