import fs from "node:fs";
import { spawnSync } from "node:child_process";

const apk = "g:/clone/sayban/.cursor/sayban-ops/tmp-com.insta.app.apk";
const aapt = "G:/sdk/build-tools/android-UpsideDownCake/aapt.exe";
const dump = spawnSync(aapt, ["dump", "--values", "resources", apk], {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024
});
const t = dump.stdout || "";
const idx = t.indexOf("string/google_app_id");
console.log("idx", idx);
const slice = t.slice(idx, idx + 300);
console.log("has_string8", slice.includes("string8"));
console.log("newline_count", (slice.match(/\n/g) || []).length);
const quotes = [...slice.matchAll(/"([^"]*)"/g)].map(m => m[1].length);
console.log("quoted_lens", quotes);
// Try lines after google_app_id that look like 1:digits:android:hex
const after = t.slice(idx, idx + 800);
const appIdMatch = after.match(/1:\d+:android:[0-9a-fA-Z]+/);
console.log(
  "candidate",
  appIdMatch
    ? {
        len: appIdMatch[0].length,
        valid: /^1:\d+:android:[0-9a-f]{24,}$/i.test(appIdMatch[0]),
        hasNonHex: /[^0-9a-f:]/i.test(appIdMatch[0].split(":android:")[1] || "")
      }
    : null
);
fs.writeFileSync(
  "g:/clone/sayban/.cursor/sayban-ops/tmp-aapt-snippet.txt",
  slice.replace(/1:\d+:android:[^\s"]+/g, "1:REDACTED:android:REDACTED")
);
console.log("wrote redacted snippet");
