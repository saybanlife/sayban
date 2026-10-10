/**
 * E2E: browser-style direct Liom upload → register URL in panel__uploads.
 * Does NOT send file bytes through n8n.
 *
 *   node scripts/e2e-panel-upload-liom.mjs
 */
import crypto from "node:crypto";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const LIOM_PANEL_UPLOAD_URL = "https://api.liom.app/upload/panel";
const LIOM_UPLOAD_PATH = "sayban";

const SECRET = "21232f297a57a5a743894a0e4a801fc3";
const PASS = "UploadLiom!2026";
const stamp = Date.now();
const EMAIL = `upload_liom_${stamp}@sayban.test`;
const MOBILE = `09${String(stamp).slice(-9)}`;
const hash = crypto.createHmac("sha256", SECRET).update(PASS).digest("hex");
const marker = `e2e-direct-${stamp}`;

/** Build a real 48×48 RGB PNG in-memory (gradient) for E2E. */
function buildPng48() {
  const w = 48;
  const h = 48;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      raw[i] = Math.min(255, x * 5);
      raw[i + 1] = Math.min(255, y * 5);
      raw[i + 2] = 180;
    }
  }
  const compressed = zlib.deflateSync(raw);
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
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
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
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
    data = { raw: text.slice(0, 500) };
  }
  return { status: res.status, data };
}

pma(
  `INSERT INTO panel__users (full_name, mobile, email, password, role, is_active, isnotif)
   VALUES ('Upload Liom SA', '${MOBILE}', '${EMAIL}', '${hash}', 'super_admin', 1, 1)`
);

const login = await json("/panel/user/login", {
  method: "POST",
  body: { userName: EMAIL, password: PASS }
});
const token = login.data?.result?.token;
if (!token) {
  throw new Error("login failed: " + JSON.stringify(login.data));
}

const png = buildPng48();
const form = new FormData();
form.append(
  "file",
  new Blob([png], { type: "image/png" }),
  `${marker}.png`
);
form.append("path", LIOM_UPLOAD_PATH);

const liomRes = await fetch(LIOM_PANEL_UPLOAD_URL, {
  method: "POST",
  body: form,
  headers: { Origin: "http://localhost:3000" }
});
const liomText = await liomRes.text();
let liom = {};
try {
  liom = JSON.parse(liomText);
} catch {
  throw new Error("Liom non-JSON: " + liomText.slice(0, 300));
}
if (!liomRes.ok || !liom.status || typeof liom.result !== "string") {
  throw new Error("Liom upload failed: " + liomText.slice(0, 400));
}
const url = liom.result;
if (!/^https?:\/\//i.test(url)) throw new Error("bad Liom url: " + url);

// Must NOT go through /upload/image with file bytes — only URL register
const reg = await json(PANEL_ROUTES.registerUpload, {
  method: "POST",
  token,
  body: {
    url,
    path: LIOM_UPLOAD_PATH,
    original_name: `${marker}.png`,
    mime_type: "image/png"
  }
});
if (!reg.data?.success) {
  throw new Error("register failed: " + JSON.stringify(reg.data));
}

// Reject legacy file-through-n8n path
const legacy = await json(PANEL_ROUTES.uploadImage, {
  method: "POST",
  token,
  body: {
    image: [
      {
        name: `${marker}-legacy.png`,
        type: "image/png",
        contents: png.toString("base64")
      }
    ]
  }
});
if (legacy.data?.success) {
  throw new Error("legacy /upload/image still accepts file contents");
}

const db = pma(
  `SELECT id, url, path, original_name FROM panel__uploads WHERE url='${url.replace(
    /'/g,
    "''"
  )}' OR original_name LIKE '%${marker}%' ORDER BY id DESC LIMIT 1`
);
if (!String(db).includes(url) && !String(db).includes(marker)) {
  throw new Error("upload row missing: " + String(db).slice(0, 800));
}

pma(
  `DELETE FROM panel__uploads WHERE original_name LIKE '%${marker}%' OR url='${url.replace(
    /'/g,
    "''"
  )}'`
);
pma(`DELETE FROM panel__users WHERE email='${EMAIL}'`);

console.log("e2e-panel-upload-liom ok", {
  url,
  liomDirect: true,
  n8nFileRejected: true
});
