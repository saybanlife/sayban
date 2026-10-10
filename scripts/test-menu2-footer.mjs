import assert from "node:assert/strict";
import fs from "node:fs";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const component = read("components/Menu2.tsx");
const styles = read("components/Menu2.module.css");

assert.match(component, /<IconMenu[\s\S]*?icons=\{item\.key\}/, "existing IconMenu icons must remain in use");
assert.match(component, /aria-current=\{[\s\S]*?active \? "page"/, "the URL-selected item must remain accessible");
assert.match(component, /countActiveBookings/);
assert.match(component, /formatBookingBadgeCount/);
assert.match(component, /styles\.badge/);
assert.match(component, /PUBLIC_ROUTES\.reservation/);
assert.doesNotMatch(component, /cutout|indicator/, "the old floating-circle navigation must be removed");
assert.match(styles, /\.itemActive\s*\{[\s\S]*?background:\s*var\(--menu-active\)/, "the active item must use the green capsule");
assert.match(styles, /\.shell\s*\{[\s\S]*?border-radius:[\s\S]*?box-shadow:/, "the footer must keep the rounded white reference shell");
assert.match(styles, /\.iconMenu\s+:global\(svg\)[\s\S]*?color:\s*currentColor/, "existing icons must inherit active and inactive colors");
assert.match(styles, /\.badge\s*\{[\s\S]*?#f9bd00/);
assert.match(styles, /\.badge\s*\{[\s\S]*border-radius:\s*999px/);
assert.match(styles, /\.badge\s*\{[\s\S]*left:\s*-0\.4rem/);

console.log("Menu2 footer tests passed.");
