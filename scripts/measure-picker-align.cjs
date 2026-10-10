/**
 * Headless Chrome dump-dom alignment check for picker fixture.
 * No Playwright download required — uses installed Chrome/Edge.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const FIXTURE = path.join(__dirname, "picker-align-fixture.html");
const TOLERANCE_PX = 1.5;
const candidates = [
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
  "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
  "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
  "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe"
].filter(Boolean);

const browser = candidates.find(p => fs.existsSync(p));
if (!browser) {
  console.error("No Chrome/Edge found");
  process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "picker-align-"));
const fileUrl = "file:///" + FIXTURE.replace(/\\/g, "/");

const result = spawnSync(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    `--user-data-dir=${profile}`,
    "--virtual-time-budget=4000",
    "--dump-dom",
    fileUrl
  ],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 60000 }
);

try {
  fs.rmSync(profile, { recursive: true, force: true });
} catch {}

if (result.status !== 0 && !result.stdout) {
  console.error(result.stderr || "browser failed");
  process.exit(1);
}

const html = result.stdout || "";
const match = html.match(
  /<pre[^>]*id=["']align-results["'][^>]*>([\s\S]*?)<\/pre>/i
);
if (!match) {
  console.error("Could not find #align-results in dump-dom output");
  console.error(html.slice(0, 500));
  process.exit(1);
}

const decoded = match[1]
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&amp;/g, "&")
  .trim();

let results;
try {
  results = JSON.parse(decoded);
} catch (e) {
  console.error("Failed to parse results JSON:", decoded.slice(0, 300));
  process.exit(1);
}

let failed = 0;
for (const r of results) {
  const slotOk =
    Math.abs(r.deltaSelectedVsIndicator) <= TOLERANCE_PX &&
    Math.abs(r.indicatorHeight - r.selectedHeight) <= TOLERANCE_PX;
  const inkOk = Math.abs(r.deltaInkVsIndicator) <= TOLERANCE_PX;
  const ok = slotOk && inkOk;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${r.id}: ` +
      `Δslot=${Number(r.deltaSelectedVsIndicator).toFixed(2)}px ` +
      `Δink=${Number(r.deltaInkVsIndicator).toFixed(2)}px ` +
      `H(ind/sel)=${Number(r.indicatorHeight).toFixed(2)}/${Number(
        r.selectedHeight
      ).toFixed(2)}`
  );
}

console.log(`\nbrowser: ${browser}`);
if (failed > 0) {
  console.error(`\n${failed}/${results.length} cases exceeded ±${TOLERANCE_PX}px`);
  process.exit(1);
}
console.log(`\nAll ${results.length} font/size cases within ±${TOLERANCE_PX}px`);
