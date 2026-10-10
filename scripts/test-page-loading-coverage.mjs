import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");
const routeLoader = read("src/fragment/RouteLoadingOverlay.tsx");
const app = read("src/pages/_app.tsx");
const homepage = read("components/Homepage.tsx");
const panel = read("components/Panel.tsx");
const overlay = read("src/fragment/PageLoadingOverlay.tsx");

for (const event of ["routeChangeStart", "routeChangeComplete", "routeChangeError"]) {
  assert.match(routeLoader, new RegExp(event), `${event} must be handled`);
}
assert.match(routeLoader, /PageLoadingOverlay/, "route changes must use the shared overlay");
assert.match(app, /<RouteLoadingOverlay\s*\/>/, "the route loader must be mounted globally");
assert.match(overlay, /untitledPicturePng\.png/, "the shared overlay must contain the Sayban logo");
for (const view of ["user", "editUser", "patient", "address", "notif"]) {
  assert.match(homepage, new RegExp(`"${view}"`), `${view} must wait for profile data`);
}
assert.match(homepage, /handleProfileLoading/, "profile requests must drive the shared loader");
assert.match(panel, /handleProfileLoading/, "panel profile request must drive the shared loader");
assert.match(panel, /loadingDisplay=\{null\}/, "panel must not paint a competing inline loader");

console.log("Page loading coverage tests passed.");