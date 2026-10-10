/**
 * E2E: center profile image — Liom direct upload → panel/update/profile URL save.
 *
 *   node scripts/e2e-panel-profile-image.mjs
 */
import crypto from "node:crypto";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const LIOM = "https://api.liom.app/upload/panel";
const SECRET = "21232f297a57a5a743894a0e4a801fc3";
const PASS = "ProfileImg!2026";
const stamp = Date.now();
const EMAIL = `profile_img_${stamp}@sayban.test`;
const MOBILE = `09${String(stamp).slice(-9)}`;
const hash = crypto.createHmac("sha256", SECRET).update(PASS).digest("hex");
const marker = `e2e-profile-${stamp}`;

function buildPng32() {
  const w = 32;
  const h = 32;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      raw[i] = 40 + x * 6;
      raw[i + 1] = 120;
      raw[i + 2] = 80 + y * 4;
    }
  }
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return ~c;
  }
  function chunk(type, data) {
    const typeBuf = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  if (r.status !== 0 || out.includes('"success": false')) {
    throw new Error(out.slice(0, 800) || r.stderr);
  }
  return out;
}

async function json(path, { method = "GET", token, body } = {}) {
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 400) };
  }
  return { status: res.status, data };
}

pma(
  `INSERT INTO panel__users (full_name, mobile, email, password, role, is_active, isnotif)
   VALUES ('Profile Img SA', '${MOBILE}', '${EMAIL}', '${hash}', 'super_admin', 1, 1)`
);

const login = await json("/panel/user/login", {
  method: "POST",
  body: { userName: EMAIL, password: PASS }
});
const token = login.data?.result?.token;
if (!token) throw new Error("login failed: " + JSON.stringify(login.data));

const centers = await json(PANEL_ROUTES.centers, { token });
const list = Array.isArray(centers.data?.result)
  ? centers.data.result
  : Array.isArray(centers.data)
    ? centers.data
    : [];
const first = list.find(row => Number(row?.id) > 0) || list[0];
const centerId = Number(first?.id);
if (!centerId) {
  throw new Error("no center from API: " + JSON.stringify(centers.data).slice(0, 500));
}
const beforeUrl = String(first?.main_image || "").trim();

const form = new FormData();
form.append("file", new Blob([buildPng32()], { type: "image/png" }), `${marker}.png`);
form.append("path", "sayban");
const liomRes = await fetch(LIOM, {
  method: "POST",
  body: form,
  headers: { Origin: "http://localhost:3000" }
});
const liom = await liomRes.json();
const url = liom?.result;
if (!liomRes.ok || !url) throw new Error("Liom failed: " + JSON.stringify(liom));

await json(PANEL_ROUTES.registerUpload, {
  method: "POST",
  token,
  body: { url, original_name: `${marker}.png`, mime_type: "image/png" }
});

const upd = await json(PANEL_ROUTES.updateProfile, {
  method: "POST",
  token,
  body: { image: [{ url }], center_id: centerId }
});
console.log("update/profile response", JSON.stringify(upd.data).slice(0, 400));
if (upd.status >= 400 || upd.data?.success === false) {
  throw new Error("update/profile failed: " + JSON.stringify(upd.data));
}

const centerGet = await json(
  `${PANEL_ROUTES.center}?id=${encodeURIComponent(String(centerId))}`,
  { token }
);
const mainImage = String(
  centerGet.data?.result?.main_image ??
    centerGet.data?.result?.center?.main_image ??
    centerGet.data?.main_image ??
    ""
).trim();
if (mainImage !== url && !mainImage.includes(String(url).split("/").pop() || "")) {
  // fallback: re-list centers
  const again = await json(PANEL_ROUTES.centers, { token });
  const rows = Array.isArray(again.data?.result) ? again.data.result : [];
  const row = rows.find(r => Number(r?.id) === centerId);
  const listed = String(row?.main_image || "").trim();
  if (listed !== url && !listed.includes(String(url).split("/").pop() || "")) {
    throw new Error(
      "main_image not updated: " +
        JSON.stringify({ mainImage, listed, url, get: centerGet.data, upd: upd.data }).slice(
          0,
          1000
        )
    );
  }
}

if (beforeUrl) {
  pma(
    `UPDATE centers SET main_image='${beforeUrl.replace(/'/g, "''")}' WHERE id=${centerId}`
  );
}
pma(`DELETE FROM panel__uploads WHERE original_name LIKE '%${marker}%'`);
pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);

console.log("e2e-panel-profile-image ok", { centerId, url });
