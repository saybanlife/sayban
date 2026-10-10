/**
 * Unit tests for panel sidebar MenuIcon mapping.
 *
 *   npx tsx scripts/test-panel-menu-icons.mjs
 */
import assert from "node:assert/strict";
import {
  resolvePanelMenuIcon,
  withPanelMenuIcon
} from "../components/panel/panelMenuIcons.ts";

assert.equal(resolvePanelMenuIcon({ value: "dashboard" }), "dashboard");
assert.equal(resolvePanelMenuIcon({ value: "centers", icon: "building-2" }), "building");
assert.equal(resolvePanelMenuIcon({ value: "staffs", icon: "service" }), "users");
assert.equal(resolvePanelMenuIcon({ value: "question", icon: "layers" }), "questioncircle");
assert.equal(resolvePanelMenuIcon({ value: "tags", icon: "tag" }), "target");
assert.equal(resolvePanelMenuIcon({ value: "support", icon: "message-circle" }), "message");
assert.equal(resolvePanelMenuIcon({ value: "send_notif", icon: "bell" }), "notification");
assert.equal(resolvePanelMenuIcon({ value: "reviews", icon: "message-circle" }), "message");
assert.equal(resolvePanelMenuIcon({ icon: "pey" }), "pey");
assert.equal(resolvePanelMenuIcon({ icon: "calendar-x" }), "warning");
assert.equal(resolvePanelMenuIcon({ icon: "unknown-xyz" }), "dashboard");

const item = withPanelMenuIcon({
  label: "مراکز",
  value: "centers",
  icon: "building-2",
  children: [{ label: "لیست", value: "list", icon: "list" }]
});
assert.equal(item.icon, "building");
assert.equal(item.children[0].icon, "notebook");

console.log("test-panel-menu-icons ok");
