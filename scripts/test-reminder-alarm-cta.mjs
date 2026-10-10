/**
 * Exact-alarm control visibility + status parsing for Reminder Settings.
 *   node --experimental-strip-types --test scripts/test-reminder-alarm-cta.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const modPath = pathToFileURL(
  path.join(process.cwd(), "src/lib/nativeShell.ts")
).href;

const {
  shouldShowExactAlarmControl,
  readNativeAlarmStatus,
  isSaybanNativeAndroid
} = await import(modPath);

function resetWindow(partial = {}) {
  globalThis.window = {
    __SAYBAN_NATIVE__: undefined,
    SaybanAndroid: undefined,
    ...partial
  };
}

test("control hidden in browser / PWA", () => {
  resetWindow();
  assert.equal(isSaybanNativeAndroid(), false);
  assert.equal(readNativeAlarmStatus(), null);
  assert.equal(shouldShowExactAlarmControl(false, null), false);
});

test("control always shown on native even when alarm already enabled", () => {
  assert.equal(
    shouldShowExactAlarmControl(true, {
      supported: true,
      enabled: true,
      permission: "granted"
    }),
    true
  );
});

test("control shown on native when alarm disabled", () => {
  assert.equal(
    shouldShowExactAlarmControl(true, {
      supported: true,
      enabled: false,
      permission: "denied"
    }),
    true
  );
});

test("control shown on native when OS does not need special access", () => {
  assert.equal(
    shouldShowExactAlarmControl(true, {
      supported: false,
      enabled: true,
      permission: "unsupported"
    }),
    true
  );
});

test("readNativeAlarmStatus uses bridge getAlarmStatus", () => {
  resetWindow({
    __SAYBAN_NATIVE__: { client: "native", platform: "android" },
    SaybanAndroid: {
      isNative: () => true,
      getAlarmStatus: () =>
        JSON.stringify({
          supported: true,
          enabled: false,
          permission: "denied"
        })
    }
  });
  assert.equal(isSaybanNativeAndroid(), true);
  assert.deepEqual(readNativeAlarmStatus(), {
    supported: true,
    enabled: false,
    permission: "denied"
  });
});

test("readNativeAlarmStatus reflects enabled from canScheduleExactAlarms", () => {
  resetWindow({
    __SAYBAN_NATIVE__: { client: "native", platform: "android" },
    SaybanAndroid: {
      isNative: () => true,
      canScheduleExactAlarms: () => true
    }
  });
  const status = readNativeAlarmStatus();
  assert.equal(status?.enabled, true);
  assert.equal(shouldShowExactAlarmControl(true, status), true);
});

test("browser path never reads alarm status", () => {
  resetWindow({});
  assert.equal(readNativeAlarmStatus(), null);
  assert.equal(shouldShowExactAlarmControl(false, null), false);
});
