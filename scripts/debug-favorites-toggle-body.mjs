import { spawnSync } from "node:child_process";
import { resolveApiUrl, PUBLIC_ROUTES } from "../src/lib/apiRoutes.ts";

const MOBILE = "09228951264";

function pma(sql) {
  return spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  }).stdout;
}

async function login() {
  await fetch(resolveApiUrl("users/auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  await new Promise(r => setTimeout(r, 1500));
  const otp = (pma(
    `SELECT mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
  ).match(/09228951264\s+(\d{4,6})/) || [])[1];
  const v = await fetch(resolveApiUrl("/users/validate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE, code: otp })
  }).then(r => r.json());
  return v?.data?.token || v?.token || v?.result?.token;
}

const token = await login();
for (const body of [
  { center_id: Number("a4a042cf") },
  { center_id: null },
  { center_id: 171 },
  { center_id: "171" }
]) {
  const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.favoritesToggle), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  console.log(JSON.stringify(body), res.status, await res.text());
}
