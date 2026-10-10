/**
 *   npx tsx scripts/test-support-callback.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  formatPhoneDisplay,
  isValidMobilePhone,
  normalizePreferredTime,
  normalizeSupportCallbackRows,
  profileMobile,
  supportOffHoursNotice
} from "../components/support/supportCallbackModel.ts";

assert.equal(isValidMobilePhone("09123456789"), true);
assert.equal(isValidMobilePhone("9123456789"), false);
assert.equal(formatPhoneDisplay("09123456789"), "۰۹۱۲ ۳۴۵ ۶۷۸۹");
assert.equal(profileMobile({ mobile: "0912-345-6789" }), "09123456789");
assert.equal(normalizePreferredTime("9:05"), "09:05");
assert.equal(normalizePreferredTime("bad"), null);

const outside = supportOffHoursNotice(new Date("2026-10-05T02:00:00+03:30"));
assert.equal(outside.outside, true);
assert.ok(outside.lines.length >= 2);

const inside = supportOffHoursNotice(new Date("2026-10-05T12:00:00+03:30"));
assert.equal(inside.outside, false);

assert.deepEqual(
  normalizeSupportCallbackRows({
    result: [
      {
        id: 1,
        user_id: 27,
        phone: "09123456789",
        time_preference: "anytime",
        created_at: "2026-10-05T10:00:00Z",
        user_name: "فاطمه"
      }
    ]
  }).map(row => [row.id, row.user_name, row.phone]),
  [[1, "فاطمه", "09123456789"]]
);

const flow = fs.readFileSync(
  new URL("../components/nurseRequest/NurseRequestFlow.tsx", import.meta.url),
  "utf8"
);
assert.match(flow, /SupportCallbackDialog/);
assert.match(flow, /پشتیبانی/);
assert.match(flow, /supportCallbackSuccess/);
assert.match(flow, /درخواست تماس ثبت شد/);
assert.match(flow, /بازگشت به خانه/);
assert.doesNotMatch(flow, /tel:\$\{SUPPORT_PHONE\}/);

const main = fs.readFileSync(
  new URL("../components/Main.tsx", import.meta.url),
  "utf8"
);
assert.match(main, /support_callbacks/);
assert.match(main, /MainPageSupportCallbacks/);

const apiUser = fs.readFileSync(
  new URL("../src/pages/api/support/[...path].ts", import.meta.url),
  "utf8"
);
assert.match(apiUser, /callbacks\/create/);

const apiPanel = fs.readFileSync(
  new URL("../src/pages/api/panel/support/[...path].ts", import.meta.url),
  "utf8"
);
assert.match(apiPanel, /path === "callbacks"/);

const staffing = fs.readFileSync(
  new URL("../components/panel/nurseStaffingAccess.ts", import.meta.url),
  "utf8"
);
assert.match(staffing, /withSupportCallbackMenuItem/);
assert.match(staffing, /support_callbacks/);

console.log("support-callback checks passed");
