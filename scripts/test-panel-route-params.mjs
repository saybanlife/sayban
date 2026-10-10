/**
 * Panel catch-all route param normalization.
 *
 *   node scripts/test-panel-route-params.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourcePath = new URL("../src/lib/panelRouteParams.ts", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString(
  "base64"
)}`;
const {
  normalizeCatchAllParam,
  panelPageSegmentsFromAsPath,
  panelPageSegmentsFromLocation,
  firstPanelPageSegment,
  panelParamsFromRouter,
  mainPageFromPanelSegment,
  panelAppHref,
  readPanelHref
} = await import(moduleUrl);

assert.equal(panelAppHref("/panel/centers"), "/panel/centers/");
assert.equal(panelAppHref("/panel/center-136/"), "/panel/center-136/");
assert.equal(panelAppHref("/panel/centers/?q=1"), "/panel/centers/?q=1");
assert.equal(
  readPanelHref("/panel/center-136/", "/panel/centers/", ""),
  "/panel/centers/"
);
assert.equal(
  readPanelHref("/panel/center-136/", undefined, undefined),
  "/panel/center-136/"
);

assert.deepEqual(normalizeCatchAllParam("users"), ["users"]);
assert.deepEqual(normalizeCatchAllParam(["users"]), ["users"]);
assert.notEqual(normalizeCatchAllParam("users")[0], "u");
assert.deepEqual(normalizeCatchAllParam(undefined), []);
assert.deepEqual(normalizeCatchAllParam(""), []);

assert.deepEqual(panelPageSegmentsFromAsPath("/panel/users/"), ["users"]);
assert.deepEqual(panelPageSegmentsFromAsPath("/panel/users"), ["users"]);
assert.deepEqual(panelPageSegmentsFromAsPath("/panel/center-12/?x=1"), [
  "center-12"
]);
assert.deepEqual(panelPageSegmentsFromAsPath("/panel/"), []);
assert.deepEqual(panelPageSegmentsFromAsPath("/panel"), []);

assert.deepEqual(
  panelPageSegmentsFromLocation("dashboard", "/panel/users/"),
  ["users"]
);
assert.deepEqual(
  panelPageSegmentsFromLocation(["dashboard"], "/panel/support"),
  ["support"]
);
assert.deepEqual(panelPageSegmentsFromLocation("users", "/panel/"), ["users"]);
assert.equal(firstPanelPageSegment("users", "/panel/"), "users");
assert.equal(firstPanelPageSegment(undefined, "/panel/login/"), "login");
assert.equal(firstPanelPageSegment(["create"], "/panel/create"), "create");

const params = panelParamsFromRouter(
  { page: "dashboard", id: "1" },
  "/panel/users/"
);
assert.deepEqual(params.page, ["users"]);
assert.equal(params.id, "1");
assert.equal(params.page[0], "users");

assert.equal(mainPageFromPanelSegment("center-12"), "center");
assert.equal(mainPageFromPanelSegment("center_info-12"), "center_info-12");
assert.equal(mainPageFromPanelSegment("service-9"), "service");
assert.equal(mainPageFromPanelSegment("user-3"), "user");
assert.equal(mainPageFromPanelSegment("users"), "users");
assert.equal(mainPageFromPanelSegment("support"), "support");
assert.equal(mainPageFromPanelSegment("dashboard"), "dashboard");

const root = process.cwd();
const panelPage = fs.readFileSync(
  path.join(root, "src/pages/panel/[[...page]].tsx"),
  "utf8"
);
assert.match(panelPage, /panelParamsFromRouter/);
assert.match(panelPage, /usePanelLocation/);
assert.match(panelPage, /route=\{asPath\}/);
assert.doesNotMatch(panelPage, /route=\{useRouter\(\)\?\.pathname\}/);
assert.doesNotMatch(panelPage, /route=\{router\.asPath\}/);

const panel = fs.readFileSync(path.join(root, "components/Panel.tsx"), "utf8");
assert.match(panel, /firstPanelPageSegment/);
assert.match(panel, /usePanelLocation/);
assert.match(panel, /mainPageFromPanelSegment/);
assert.match(panel, /key=\{pageSegment/);

const centerPage = fs.readFileSync(
  path.join(root, "components/CenterPage.tsx"),
  "utf8"
);
assert.match(centerPage, /onClick: _ignoreGeneratedHistoryBack/);

const servicePage = fs.readFileSync(
  path.join(root, "components/ServicePage.tsx"),
  "utf8"
);
assert.match(servicePage, /onClick: _ignoreGeneratedHistoryBack/);
assert.match(servicePage, /panelAppHref\("\/panel\/services"\)/);

const main = fs.readFileSync(path.join(root, "components/Main.tsx"), "utf8");
assert.match(main, /key=\{plasmicTreeKey\}/);

console.log("panel route params ok");
