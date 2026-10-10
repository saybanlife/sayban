import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const routeSource = read("components/centerNavigation.ts");
const routeOutput = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const routeModule = await import(
  `data:text/javascript;base64,${Buffer.from(routeOutput).toString("base64")}`
);
assert.equal(routeModule.buildCenterRoute("home", 42), "/home/center/42");
assert.equal(routeModule.buildCenterRoute("panel", "a/b"), "/panel/center/a%2Fb");
assert.equal(routeModule.buildCenterRoute("../bad", 9), "/bad/center/9");
assert.equal(routeModule.buildCenterRoute("home", ""), null);
assert.equal(routeModule.buildStaffRoute("home", 40), "/home/staff_40");
assert.equal(routeModule.buildStaffRoute("home", "x"), null);
assert.equal(
  routeModule.buildCenterStaffListRoute("home", 108),
  "/home/centerStaffs_108"
);
assert.equal(
  routeModule.extractCenterStaffsIdFromSlug(["centerStaffs_108"]),
  "108"
);

const bookingCss = read("components/BookingLayout.module.css");
assert.match(bookingCss, /overflow-x:\s*auto/);
assert.match(bookingCss, /flex:\s*0 0 auto\s*!important/);
assert.match(bookingCss, /max-width:\s*none\s*!important/);
assert.match(bookingCss, /-webkit-overflow-scrolling:\s*touch/);

const input = read("components/HomeSearchInput.tsx");
assert.match(input, /useState\(externalValue\)/);
assert.match(input, /HOME_SEARCH_DEBOUNCE_MS = 250/);
assert.match(input, /onDebouncedValueChange\?\.\(value\)/);

const homepage = read("components/Homepage.tsx");
assert.match(homepage, /keyword:\s*searchKeyword\.trim\(\)/);
assert.match(homepage, /onDebouncedValueChange=\{setSearchKeyword\}/);

const staff = read("components/ItemStaffs2.tsx");
assert.match(staff, /setAttribute\("role", "link"\)/);
assert.match(staff, /event\.key === "Enter" \|\| event\.key === " "/);
assert.match(staff, /router\.push\(route\)/);

console.log("Booking layout, staff center navigation, and home search tests passed.");
