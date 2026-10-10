/**
 * Recover google-services.json from a device APK (aapt dump) without printing secrets.
 * Usage (from sayban repo):
 *   node scripts/recover-google-services-from-apk.mjs [path-to-apk]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const apk =
  process.argv[2] ||
  path.join(".cursor", "sayban-ops", "tmp-com.insta.app.apk");
const aapt = "G:\\sdk\\build-tools\\android-UpsideDownCake\\aapt.exe";
const outJson = path.join("G:", "clone", "insta", "app", "google-services.json");
const dumpFile = path.join(".cursor", "sayban-ops", "tmp-aapt-resources.txt");

if (!fs.existsSync(apk)) {
  console.error("APK missing:", apk);
  process.exit(1);
}
if (!fs.existsSync(aapt)) {
  console.error("aapt missing:", aapt);
  process.exit(1);
}

const dump = spawnSync(aapt, ["dump", "--values", "resources", apk], {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024
});
fs.writeFileSync(dumpFile, dump.stdout || "");
const t = dump.stdout || "";

function val(name) {
  const re = new RegExp(
    String.raw`string/${name}:[\s\S]*?\(string8\) "([^"]+)"`
  );
  const m = t.match(re);
  if (m) return m[1];
  const re2 = new RegExp(String.raw`string/${name}[^\n]*\n[^\n]*?"([^"]+)"`);
  const m2 = t.match(re2);
  return m2 ? m2[1] : null;
}

const found = {
  google_app_id: val("google_app_id"),
  gcm_defaultSenderId: val("gcm_defaultSenderId"),
  google_api_key: val("google_api_key"),
  google_storage_bucket: val("google_storage_bucket"),
  project_id: val("project_id")
};

const appId = found.google_app_id || "";
const valid = /^1:\d+:android:[0-9a-f]{24,}$/i.test(appId);
console.log(
  "appId_valid=",
  valid,
  "appId_len=",
  appId.length,
  "keys=",
  Object.fromEntries(
    Object.entries(found).map(([k, v]) => [k, Boolean(v)])
  )
);
if (!valid) {
  console.error("Could not recover a valid mobilesdk_app_id from APK");
  process.exit(2);
}

const gs = {
  project_info: {
    project_number: found.gcm_defaultSenderId || "856382957880",
    project_id: found.project_id || "sayban-web",
    storage_bucket:
      found.google_storage_bucket || "sayban-web.firebasestorage.app"
  },
  client: [
    {
      client_info: {
        mobilesdk_app_id: appId,
        android_client_info: { package_name: "com.insta.app" }
      },
      oauth_client: [],
      api_key: [{ current_key: found.google_api_key || "" }],
      services: { appinvite_service: { other_platform_oauth_client: [] } }
    }
  ],
  configuration_version: "1"
};

fs.writeFileSync(outJson, JSON.stringify(gs, null, 2) + "\n");
console.log("WROTE", outJson);
process.exit(0);
