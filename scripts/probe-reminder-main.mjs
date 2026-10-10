import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:3001/dev/reminder-main-preview/", {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /یادآوری/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const names = [...document.querySelectorAll("[data-plasmic-name]")].map(el => {
    const r = el.getBoundingClientRect();
    return {
      name: el.getAttribute("data-plasmic-name"),
      w: Math.round(r.width),
      h: Math.round(r.height),
      t: Math.round(r.top),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)
    };
  }).filter(x => x.w > 0 && x.h > 0);

  return {
    body: (document.body.innerText || "").slice(0, 600),
    eventPage: !!document.querySelector("[data-reminder-event-page]"),
    eventOpenHost: !!document.querySelector('[data-reminder-event-open="1"]'),
    interesting: names.filter(
      n =>
        /button|dialog|reminder|img|add|setting/i.test(n.name || "") ||
        /افزودن|دارو|\+|✎/.test(n.text)
    ),
    allNames: [...new Set(names.map(n => n.name))]
  };
});

console.log(JSON.stringify(info, null, 2));
await page.screenshot({
  path: "scripts/fixtures/reminder-main-probe.png",
  fullPage: true
});
await browser.close();
