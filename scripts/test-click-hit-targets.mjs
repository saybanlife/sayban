/**
 * Click hit-testing: closed overlays and fixed chrome must not eat taps.
 *
 *   node scripts/test-click-hit-targets.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const globals = read("src/styles/globals.css");
assert.match(
  globals,
  /\[data-radix-dialog-overlay\]\[data-state="closed"\][\s\S]*pointer-events:\s*none\s*!important/
);
assert.match(
  globals,
  /\[data-radix-dialog-overlay\]\[data-state="open"\]/
);
assert.doesNotMatch(
  globals,
  /html\[data-sayban-shell="wide"\] \[data-radix-dialog-overlay\],\s*\nhtml\[data-sayban-shell="wide"\] \.pl__fixed/
);

const panelTheme = read("src/styles/panel-theme.css");
assert.match(
  panelTheme,
  /\[data-panel-nav="closed"\]::before[\s\S]*pointer-events:\s*none/
);

const homepageCss = read(
  "components/plasmic/sayban/PlasmicHomepage.module.css"
);
assert.match(
  homepageCss,
  /\.section__pJCrL\s*\{[\s\S]*pointer-events:\s*none/
);
assert.match(
  homepageCss,
  /\.section__pJCrL\s*>\s*\*\s*\{[\s\S]*pointer-events:\s*auto/
);

const buttonCss = read(
  "components/plasmic/sayban/PlasmicButton.module.css"
);
assert.match(
  buttonCss,
  /\.softBackground\s*\{[\s\S]*pointer-events:\s*none/
);
assert.match(
  buttonCss,
  /\.interactionEffect\s*\{[\s\S]*pointer-events:\s*none/
);

const panelMenu = read("components/PanelMenu.tsx");
assert.match(panelMenu, /syncPanelNavAttr\(null\)/);
assert.match(panelMenu, /useState<SidebarMode>\("collapsed"\)/);

const button = read("components/Button.tsx");
assert.match(button, /AUTO_LOADING_MAX_MS/);

console.log("ok   click hit-target contract");
