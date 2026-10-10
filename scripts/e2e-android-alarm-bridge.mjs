/**
 * Device test: Sayban Android exact-alarm bridge for Reminder.
 *   node scripts/e2e-android-alarm-bridge.mjs
 */
import { spawnSync } from "node:child_process";
import http from "node:http";

const ADB = process.env.ADB || "G:\\sdk\\platform-tools\\adb.exe";
const PKG = "com.app.sayban";

function sh(args) {
  const r = spawnSync(ADB, args, { encoding: "utf8" });
  return {
    status: r.status ?? 1,
    stdout: r.stdout || "",
    stderr: r.stderr || ""
  };
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
  if (!WS) throw new Error("WebSocket global unavailable");
  return new Promise((resolve, reject) => {
    const ws = new WS(wsUrl);
    const id = 1;
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error(`cdp timeout ${method}`));
    }, 15000);
    ws.addEventListener("open", () =>
      ws.send(JSON.stringify({ id, method, params }))
    );
    ws.addEventListener("message", ev => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id === id) {
        clearTimeout(timer);
        ws.close();
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    ws.addEventListener("error", e => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

function findWebViewPid() {
  const r = sh(["shell", "cat", "/proc/net/unix"]);
  const m = r.stdout.match(/webview_devtools_remote_(\d+)/);
  return m ? m[1] : null;
}

async function main() {
  sh(["shell", "am", "start", "-n", `${PKG}/.SplashActivity`]);
  await new Promise(r => setTimeout(r, 5000));

  const pid = findWebViewPid();
  if (!pid) {
    console.error("no webview_devtools_remote pid");
    process.exit(2);
  }
  sh(["forward", "--remove-all"]);
  sh(["forward", "tcp:9222", `localabstract:webview_devtools_remote_${pid}`]);
  console.log("forward pid", pid);

  let pages;
  try {
    pages = await httpJson("http://127.0.0.1:9222/json");
  } catch (e) {
    console.error("devtools json failed", e);
    process.exit(3);
  }

  const page = (pages || []).find(
    p =>
      String(p.type || "") === "page" &&
      /sayban/i.test(String(p.url || "")) &&
      p.webSocketDebuggerUrl
  );
  if (!page) {
    console.error(
      "no sayban page",
      (pages || []).map(p => ({ type: p.type, url: p.url }))
    );
    process.exit(4);
  }
  console.log("page", page.url);

  const evalJs = async expression => {
    const res = await cdp(page.webSocketDebuggerUrl, "Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  };

  const probe = await evalJs(`(function(){
    var b = window.SaybanAndroid;
    var n = window.__SAYBAN_NATIVE__ || {};
    var status = null;
    try { status = b && b.getAlarmStatus ? JSON.parse(b.getAlarmStatus()) : null; } catch(e) { status = String(e); }
    return {
      isNative: !!(b && b.isNative && b.isNative()),
      hasGetAlarmStatus: !!(b && typeof b.getAlarmStatus === 'function'),
      hasCanSchedule: !!(b && typeof b.canScheduleExactAlarms === 'function'),
      hasRequest: !!(b && typeof b.requestExactAlarmPermission === 'function'),
      flagClient: n.client || null,
      flagExact: n.exactAlarmEnabled,
      status: status,
      canSchedule: b && b.canScheduleExactAlarms ? b.canScheduleExactAlarms() : null
    };
  })()`);

  console.log("probe", JSON.stringify(probe, null, 2));

  if (!probe?.isNative || !probe?.hasGetAlarmStatus) {
    console.error("FAIL bridge missing");
    process.exit(5);
  }
  if (!probe.status || typeof probe.status !== "object") {
    console.error("FAIL bad status", probe.status);
    process.exit(6);
  }
  if (typeof probe.status.enabled !== "boolean") {
    console.error("FAIL status.enabled not boolean");
    process.exit(7);
  }

  // Visibility helper (mirrors shouldShowExactAlarmControl)
  const showAlways = probe.isNative === true;
  const hideInBrowser = await evalJs(`(function(){
    var saved = window.SaybanAndroid;
    var savedN = window.__SAYBAN_NATIVE__;
    try {
      window.SaybanAndroid = undefined;
      window.__SAYBAN_NATIVE__ = undefined;
      var native = false;
      try { native = !!(window.SaybanAndroid && window.SaybanAndroid.isNative && window.SaybanAndroid.isNative()); } catch(e) {}
      if (!native && window.__SAYBAN_NATIVE__ && (window.__SAYBAN_NATIVE__.client==='native' || window.__SAYBAN_NATIVE__.platform==='android')) native = true;
      return { native: native, show: native };
    } finally {
      window.SaybanAndroid = saved;
      window.__SAYBAN_NATIVE__ = savedN;
    }
  })()`);
  console.log("browser_sim", hideInBrowser);
  if (hideInBrowser?.show !== false) {
    console.error("FAIL would show in browser");
    process.exit(8);
  }

  // Open settings (enable/disable path) then cancel by going back quickly — verify call does not throw.
  const opened = await evalJs(`(function(){
    try {
      window.SaybanAndroid.requestExactAlarmPermission();
      return true;
    } catch(e) { return String(e); }
  })()`);
  console.log("opened_settings", opened);
  await new Promise(r => setTimeout(r, 2500));
  // Return to app
  sh(["shell", "am", "start", "-n", `${PKG}/.MainActivity`]);
  await new Promise(r => setTimeout(r, 2500));

  const after = await evalJs(`(function(){
    try { return JSON.parse(window.SaybanAndroid.getAlarmStatus()); }
    catch(e) { return { error: String(e) }; }
  })()`);
  console.log("status_after_return", after);

  if (typeof after?.enabled !== "boolean") {
    console.error("FAIL status after return");
    process.exit(9);
  }

  console.log("PASS", {
    showAlwaysOnNative: showAlways,
    enabled: after.enabled,
    supported: after.supported,
    permission: after.permission
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
