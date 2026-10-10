/**
 *   node scripts/test-footer-route-loading.mjs
 */
import { isFooterShellLanding } from "../src/fragment/footerShellNav.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isFooterShellLanding("/home/"), "home landing");
assert(isFooterShellLanding("/user"), "user landing");
assert(isFooterShellLanding("/reminder/"), "reminder landing");
assert(!isFooterShellLanding("/home/center/1"), "nested home must show loader");
assert(!isFooterShellLanding("/user/favorites/"), "favorites must show loader");
assert(!isFooterShellLanding("/login/mobile/"), "login not footer shell");

console.log("footer route-loading helper PASS");
