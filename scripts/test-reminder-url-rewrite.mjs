/**
 * Contract test for reminder URL rewrite (mirrors resolveClientApiUrl.ts).
 *   node --test scripts/test-reminder-url-rewrite.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE_URL = "https://sayban.darkube.ir/webhook/";
const STAAS = "https://n8n.staas.ir/webhook/";
const ALIASES = {
  "reminders/category": "reminders/categories",
  "reminders/suggestions1": "reminders/suggestions",
  "hamyar/reminder": "user/task/add"
};

function resolve(url) {
  if (!url) return url;
  if (url.startsWith(STAAS)) {
    const path = url.slice(STAAS.length).replace(/^\/+/, "");
    const base = path.split("?")[0].replace(/\/+$/, "");
    const q = path.includes("?") ? path.slice(path.indexOf("?")) : "";
    return `${API_BASE_URL}${ALIASES[base] || base}${q}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const withoutLeading = url.replace(/^\/+/, "");
  const base = withoutLeading.split("?")[0].replace(/\/+$/, "");
  const q = withoutLeading.includes("?")
    ? withoutLeading.slice(withoutLeading.indexOf("?"))
    : "";
  return `${API_BASE_URL}${ALIASES[base] || base}${q}`;
}

test("staas reminder URLs map to Sayban", () => {
  assert.equal(resolve(`${STAAS}user/task/list`), `${API_BASE_URL}user/task/list`);
  assert.equal(
    resolve(`${STAAS}reminders/category`),
    `${API_BASE_URL}reminders/categories`
  );
  assert.equal(
    resolve(`${STAAS}reminders/suggestions1`),
    `${API_BASE_URL}reminders/suggestions`
  );
  assert.equal(resolve(`${STAAS}wallet`), `${API_BASE_URL}wallet`);
  assert.equal(resolve(`${STAAS}hamyar/reminder`), `${API_BASE_URL}user/task/add`);
});

test("relative reminder paths resolve", () => {
  assert.equal(resolve("user/task/add"), `${API_BASE_URL}user/task/add`);
  assert.equal(resolve("reminders/category"), `${API_BASE_URL}reminders/categories`);
  assert.equal(resolve("wallet"), `${API_BASE_URL}wallet`);
});
