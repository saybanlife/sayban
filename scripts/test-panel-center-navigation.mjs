/**
 * Panel center navigation helpers (list ↔ detail ↔ registration review).
 *
 *   node scripts/test-panel-center-navigation.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function centerDetailPath(rowKey, row) {
  const id = String(row?.id ?? rowKey ?? "").trim();
  return /^\d+$/.test(id) ? `/panel/center-${id}/` : null;
}

function centerInfoPath(centerId) {
  const id = String(centerId ?? "").trim();
  return /^\d+$/.test(id) ? `/panel/center_info-${id}/` : null;
}

function isCenterDetailPage(page) {
  return page.startsWith("center-") && !page.startsWith("center_info");
}

function isCenterInfoPage(page) {
  return /^center_info-\d+$/.test(page);
}

function centerIdFromPanelPage(page, queryId) {
  if (isCenterDetailPage(page)) {
    const id = page.slice("center-".length).trim();
    return id || null;
  }
  if (page === "center") {
    const id = Array.isArray(queryId) ? queryId[0] : queryId;
    const trimmed = String(id ?? "").trim();
    return trimmed || null;
  }
  return null;
}

function panelMenuSelectionForPage(page) {
  const raw = String(page || "").trim();
  if (
    raw === "centers" ||
    isCenterDetailPage(raw) ||
    isCenterInfoPage(raw)
  ) {
    return "centers";
  }
  return raw || "dashboard";
}

assert.equal(centerDetailPath(12), "/panel/center-12/");
assert.equal(centerDetailPath("x"), null);
assert.equal(centerInfoPath(9), "/panel/center_info-9/");
assert.equal(isCenterDetailPage("center-12"), true);
assert.equal(isCenterDetailPage("center_info-12"), false);
assert.equal(isCenterInfoPage("center_info-12"), true);
assert.equal(centerIdFromPanelPage("center-42", undefined), "42");
assert.equal(centerIdFromPanelPage("center_info-42", undefined), null);
assert.equal(centerIdFromPanelPage("center", "7"), "7");
assert.equal(panelMenuSelectionForPage("center-12"), "centers");
assert.equal(panelMenuSelectionForPage("center_info-12"), "centers");
assert.equal(panelMenuSelectionForPage("centers"), "centers");
assert.equal(panelMenuSelectionForPage("tags"), "tags");

const root = process.cwd();
const lib = fs.readFileSync(
  path.join(root, "src/lib/panelCenterNavigation.ts"),
  "utf8"
);
assert.match(lib, /router\.replace\(panelAppHref\(PANEL_CENTERS_PATH\)\)/);
assert.match(lib, /panelMenuSelectionForPage/);

const centerPage = fs.readFileSync(
  path.join(root, "components/CenterPage.tsx"),
  "utf8"
);
assert.match(centerPage, /navigateToCentersList\(router\)/);
assert.doesNotMatch(centerPage, /router\.push\(PANEL_CENTERS_PATH\)/);

const review = fs.readFileSync(
  path.join(root, "components/centerPanel/CenterRegistrationReview.tsx"),
  "utf8"
);
assert.match(review, /navigateToCentersList\(router\)/);
assert.doesNotMatch(review, /router\.push\("\/panel\/centers"\)/);

const panel = fs.readFileSync(path.join(root, "components/Panel.tsx"), "utf8");
assert.match(panel, /panelMenuSelectionForPage/);
assert.match(panel, /selecteItem=\{menuSelection\}/);

// Add-service dialog: center_admin has no Select; validation must accept centerId.
const plasmicMain = fs.readFileSync(
  path.join(root, "components/plasmic/sayban/PlasmicMain.tsx"),
  "utf8"
);
assert.match(
  plasmicMain,
  /if \(!\(\$props\.centerId \|\| \$state\.select\.value\)\)/
);
assert.match(
  plasmicMain,
  /center_id:\s*\$props\.centerId \|\| \$state\.select\.value/
);

console.log("panel center navigation ok");
