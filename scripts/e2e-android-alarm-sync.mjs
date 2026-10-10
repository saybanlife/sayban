/**
 * Grant/deny SCHEDULE_EXACT_ALARM via appops and verify WebView bridge sync.
 *   node scripts/e2e-android-alarm-sync.mjs
 */
import { spawnSync } from "node:child_process";
import http from "node:http";

const ADB = process.env.ADB || "G:\\sdk\\platform-tools\\adb.exe";
const PKG = "com.app.sayban";

function sh(args) {
  return spawnSync(ADB, args, { encoding: "utf8" });
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function cdp(wsUrl, method, params = {}) {
  const WS = globalThis.WebSocket;
  return new Promise((resolve, reject) => {
    const ws = new WS(wsUrl);
    const id = 1;
    const t = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error(`timeout ${method}`));
    }, 15000);
    ws.addEventListener("open", () =>
      ws.send(JSON.stringify({ id, method, params }))
    );
    ws.addEventListener("message", ev => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id === id) {
        clearTimeout(t);
        ws.close();
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    ws.addEventListener("error", e => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function getPageWs() {
  const unix = sh(["shell", "cat", "/proc/net/unix"]).stdout || "";
  const pid = (unix.match(/webview_devtools_remote_(\d+)/) || [])[1];
  if (!pid) throw new Error("no webview pid");
  sh(["forward", "--remove", "tcp:9222"]);
  sh(["forward", "tcp:9222", `localabstract:webview_devtools_remote_${pid}`]);
  await new Promise(r => setTimeout(r, 400));
  const pages = await httpJson("http://127.0.0.1:9222/json");
  const page = (pages || []).find(
    p =>
      p.type === "page" &&
      /sayban/i.test(String(p.url || "")) &&
      p.webSocketDebuggerUrl
  );
  if (!page) throw new Error("no sayban page");
  return page.webSocketDebuggerUrl;
}

async function readStatus(wsUrl) {
  const res = await cdp(wsUrl, "Runtime.evaluate", {
    expression:
      "(function(){try{return JSON.parse(window.SaybanAndroid.getAlarmStatus());}catch(e){return {error:String(e)};}})()",
    returnByValue: true
  });
  return res?.result?.value;
}

async function setAlarm(mode) {
  // allow | ignore (deny-ish for SCHEDULE_EXACT_ALARM)
  sh(["shell", "appops", "set", PKG, "SCHEDULE_EXACT_ALARM", mode]);
  sh(["shell", "am", "start", "-n", `${PKG}/.MainActivity`]);
  await new Promise(r => setTimeout(r, 2000));
}

async function main() {
  sh(["shell", "am", "start", "-n", `${PKG}/.SplashActivity`]);
  await new Promise(r => setTimeout(r, 4000));

  console.log("== deny ==");
  await setAlarm("ignore");
  let ws = await getPageWs();
  let status = await readStatus(ws);
  console.log("denied_status", status);
  if (status?.supported && status.enabled !== false) {
    console.error("FAIL expected enabled=false after ignore");
    process.exit(2);
  }

  console.log("== allow ==");
  await setAlarm("allow");
  ws = await getPageWs();
  status = await readStatus(ws);
  console.log("allowed_status", status);
  if (!status || status.enabled !== true) {
    console.error("FAIL expected enabled=true after allow");
    process.exit(3);
  }

  // Restore to a known state (leave allowed for usability)
  console.log("PASS sync ok", status);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
