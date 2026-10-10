/**
 * Live E2E: reservation-details operational paths against real webhook + DB.
 * Creates disposable rows owned by the OTP user, exercises success/error, cleans up.
 *
 *   node scripts/e2e-reservation-details-actions-live.mjs
 */
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PUBLIC_ROUTES } from "../src/lib/apiRoutes.ts";

const MOBILE = "09228951264";
const MARKER = `e2e-res-actions-${Date.now()}`;

const results = [];
const createdIds = [];
let USER_ID = 0;

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  const j = JSON.parse(out);
  if (j.success === false) throw new Error(j.error || j.text || "pma error");
  return j;
}

/** Parse `DELETE FROM ... id` = N N ...` rows from phpMyAdmin HTML text. */
function parseDeleteRows(text, expectedCols = 2) {
  const rows = [];
  const re =
    /DELETE FROM `\w+` WHERE `\w+`\.`id` = (\d+)\s+(\d+)(?:\s+(\S+))?(?:\s+(\S+))?/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    const id = Number(m[1]);
    if (!Number.isFinite(id)) continue;
    rows.push({
      id,
      col2: m[2],
      col3: m[3] || null,
      col4: m[4] || null
    });
  }
  if (!rows.length && expectedCols) {
    // Fallback: id status description pattern after header
    const re2 = /\b(\d{2,})\s+(pending|confirmed|canceled|awaitingOffers|awaitingSupport|awaitingPayment|offersReceived|nurseSelected|completed|rejected|inProgress|paymentCompleted)\b/g;
    while ((m = re2.exec(String(text || "")))) {
      rows.push({ id: Number(m[1]), col2: m[1], col3: m[2], col4: null });
    }
  }
  return rows;
}

function extractOtp(text) {
  return String(text).match(/09228951264\s+(\d{4})\s+/)?.[1] || null;
}

function decodeJwtUserId(jwt) {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")
    );
    return Number(payload.id || payload.user_id || payload.sub) || 0;
  } catch {
    return 0;
  }
}

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function login() {
  await fetch(resolveApiUrl("users/auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  await new Promise(r => setTimeout(r, 1200));
  const otp = extractOtp(
    pma(
      `SELECT id, mobile, code, timestamp FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
    ).text || ""
  );
  if (!otp) throw new Error("otp missing");
  const valJson = await (
    await fetch(resolveApiUrl("/users/validate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ mobile: MOBILE, code: otp })
    })
  ).json();
  const jwt =
    valJson?.data?.token ||
    valJson?.token ||
    valJson?.result?.token ||
    null;
  if (!jwt) throw new Error("jwt missing");
  USER_ID = decodeJwtUserId(jwt);
  if (!USER_ID) {
    const lookup = pma(
      `SELECT id, mobile FROM users WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
    );
    const row = parseDeleteRows(lookup.text || "")[0];
    USER_ID = row?.id || 0;
  }
  if (!USER_ID) throw new Error("could not resolve user id for OTP mobile");
  return jwt;
}

async function lifecycle(jwt, body) {
  const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.reservationLifecycle), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${jwt}`
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text: text.slice(0, 400), rawLen: text.length };
}

async function details(jwt, id) {
  const res = await fetch(
    resolveApiUrl(`${PUBLIC_ROUTES.reservationDetails}?id=${id}`),
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`
      },
      cache: "no-store"
    }
  );
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function insertReservation({
  status,
  serviceId = null,
  serviceLocation = "home",
  centerId = null,
  staffId = null,
  finalPrice = null,
  paymentStatus = "unpaid"
}) {
  const desc = `${MARKER}:${status}`;
  const sql = `INSERT INTO reservations
    (user_id, status, service_id, service_location, center_id, staff_id, final_price, payment_status, payment_method, description, created_at, updated_at)
    VALUES (
      ${USER_ID},
      '${status}',
      ${serviceId == null ? "NULL" : serviceId},
      '${serviceLocation}',
      ${centerId == null ? "NULL" : centerId},
      ${staffId == null ? "NULL" : staffId},
      ${finalPrice == null ? "NULL" : finalPrice},
      '${paymentStatus}',
      'online',
      '${desc}',
      NOW(),
      NOW()
    )`;
  pma(sql);
  const found = pma(
    `SELECT id, status, description FROM reservations WHERE user_id=${USER_ID} AND description='${desc}' ORDER BY id DESC LIMIT 1`
  );
  const row = parseDeleteRows(found.text || "")[0];
  const id = row?.id;
  if (!Number.isFinite(id)) {
    throw new Error(`insert parse failed for ${status}: ${(found.text || "").slice(-300)}`);
  }
  createdIds.push(id);
  return id;
}

function statusOf(id) {
  const found = pma(`SELECT id, status FROM reservations WHERE id=${id} LIMIT 1`);
  const row = parseDeleteRows(found.text || "")[0];
  return row?.col3 || null;
}

function cleanup() {
  if (!createdIds.length) return;
  const ids = [...new Set(createdIds)].join(",");
  try {
    pma(`DELETE FROM centers__offers WHERE reservation_id IN (${ids})`);
  } catch {
    /* ignore */
  }
  try {
    pma(`DELETE FROM reservations__lifecycle WHERE reservation_id IN (${ids})`);
  } catch {
    /* ignore */
  }
  pma(
    `DELETE FROM reservations WHERE id IN (${ids}) AND user_id=${USER_ID} AND description LIKE '${MARKER}:%'`
  );
}

try {
  console.log("== login ==");
  const jwt = await login();
  record("login", true, `user=${USER_ID} jwt_len=${jwt.length}`);

  // Clean leftover markers from prior broken runs for this user
  pma(
    `DELETE FROM reservations WHERE user_id=${USER_ID} AND description LIKE 'e2e-res-actions-%'`
  );

  console.log("== seed ==");
  const pendingVisit = insertReservation({
    status: "pending",
    serviceId: 126,
    serviceLocation: "center",
    centerId: 74,
    finalPrice: 0
  });
  const confirmedVisit = insertReservation({
    status: "confirmed",
    serviceId: 126,
    serviceLocation: "center",
    centerId: 74,
    finalPrice: 0
  });
  const awaitingSupportNurse = insertReservation({
    status: "awaitingSupport",
    serviceLocation: "home"
  });
  const awaitingPaymentNurse = insertReservation({
    status: "awaitingPayment",
    serviceLocation: "home",
    centerId: 151,
    staffId: 41,
    finalPrice: 510000
  });
  const offersReceived = insertReservation({
    status: "offersReceived",
    serviceLocation: "home"
  });
  const completed = insertReservation({
    status: "completed",
    serviceId: 95,
    serviceLocation: "home",
    centerId: 74,
    finalPrice: 100000,
    paymentStatus: "paid"
  });
  record(
    "seed",
    true,
    `ids=${[pendingVisit, confirmedVisit, awaitingSupportNurse, awaitingPaymentNurse, offersReceived, completed].join(",")}`
  );

  pma(
    `INSERT INTO centers__offers (reservation_id, center_id, staff_id, proposed_date, proposed_time, min_price, max_price)
     VALUES (${offersReceived}, 151, 41, CURDATE(), '10:00:00', 100000, 500000)`
  );

  console.log("== details ==");
  for (const id of [pendingVisit, awaitingPaymentNurse, offersReceived]) {
    const d = await details(jwt, id);
    const row = d.json?.result || d.json;
    const ok =
      d.status === 200 &&
      d.json?.success !== false &&
      row &&
      Number(row.id) === id;
    record(`details:${id}`, Boolean(ok), `http=${d.status} success=${d.json?.success}`);
  }

  console.log("== cancel success ==");
  for (const [label, id] of [
    ["pendingVisit", pendingVisit],
    ["confirmedVisit", confirmedVisit],
    ["awaitingSupport", awaitingSupportNurse]
  ]) {
    const res = await lifecycle(jwt, {
      reservation_id: id,
      action: "cancel_request"
    });
    const st = statusOf(id);
    const ok =
      res.status < 400 &&
      (res.json?.success === true || st === "canceled") &&
      st === "canceled";
    record(
      `cancel:${label}`,
      ok,
      `http=${res.status} status=${st} bodyLen=${res.rawLen} success=${res.json?.success}`
    );
    if (!ok) console.log("  body", res.text);
  }

  console.log("== cancel / lifecycle errors ==");
  {
    const res = await lifecycle(jwt, {
      reservation_id: completed,
      action: "cancel_request"
    });
    const st = statusOf(completed);
    const blocked =
      st === "completed" &&
      (res.status >= 400 ||
        res.json?.success === false ||
        res.rawLen === 0 ||
        /مرحله|cancel|نمی/i.test(res.text || ""));
    record(
      "cancel:completed→blocked",
      Boolean(blocked),
      `http=${res.status} status=${st} bodyLen=${res.rawLen}`
    );
  }
  {
    const res = await lifecycle(jwt, {
      reservation_id: 999999001,
      action: "cancel_request"
    });
    const rejected =
      res.status >= 400 ||
      res.json?.success === false ||
      res.rawLen === 0;
    record("cancel:missing→error", Boolean(rejected), `http=${res.status} bodyLen=${res.rawLen}`);
  }
  {
    const res = await lifecycle(jwt, {
      reservation_id: awaitingPaymentNurse,
      action: "not_a_real_action"
    });
    const rejected =
      res.status >= 400 ||
      res.json?.success === false ||
      res.rawLen === 0;
    record("lifecycle:bad-action→error", Boolean(rejected), `http=${res.status}`);
  }

  console.log("== offer select ==");
  {
    const selectRes = await fetch(resolveApiUrl("reservations/steff/update"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`
      },
      body: JSON.stringify({
        id: offersReceived,
        staff_id: 41,
        center_id: 151,
        final_price: 510000,
        start_time: `${new Date().toISOString().slice(0, 10)} 10:00:00`,
        preferred_staff_gender: "any",
        payment_method: "online",
        min_price: 100000,
        max_price: 500000
      })
    });
    const selectJson = await selectRes.json().catch(() => null);
    const st = statusOf(offersReceived);
    const ok =
      selectRes.ok &&
      selectJson?.success !== false &&
      ["awaitingPayment", "nurseSelected", "paymentCompleted", "confirmed"].includes(
        String(st)
      );
    record(
      "offer:select",
      Boolean(ok),
      `http=${selectRes.status} status=${st} success=${selectJson?.success}`
    );
  }

  {
    const st = statusOf(awaitingPaymentNurse);
    const payOk = st === "awaitingPayment";
    record("pay:target-ready", payOk, `status=${st}`);
  }

  {
    const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.reservationLifecycle), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        reservation_id: awaitingPaymentNurse,
        action: "cancel_request"
      })
    });
    record("cancel:no-auth→error", res.status >= 400, `http=${res.status}`);
  }

  // cancel awaitingPayment (success path for nurse pay status)
  {
    const res = await lifecycle(jwt, {
      reservation_id: awaitingPaymentNurse,
      action: "cancel_request"
    });
    const st = statusOf(awaitingPaymentNurse);
    record(
      "cancel:awaitingPayment",
      st === "canceled" && res.json?.success !== false,
      `http=${res.status} status=${st}`
    );
  }
} catch (err) {
  record("fatal", false, String(err?.message || err));
  console.error(err);
} finally {
  console.log("== cleanup ==");
  try {
    cleanup();
    // also remove orphan markers for this user if ids unknown
    if (USER_ID) {
      pma(
        `DELETE o FROM centers__offers o
         INNER JOIN reservations r ON r.id = o.reservation_id
         WHERE r.user_id=${USER_ID} AND r.description LIKE 'e2e-res-actions-%'`
      );
      pma(
        `DELETE FROM reservations WHERE user_id=${USER_ID} AND description LIKE 'e2e-res-actions-%'`
      );
    }
    record("cleanup", true, `deleted=${[...new Set(createdIds)].join(",")}`);
  } catch (err) {
    record("cleanup", false, String(err?.message || err));
  }
}

const failed = results.filter(r => !r.ok);
console.log("\n== summary ==");
console.log(`passed=${results.filter(r => r.ok).length} failed=${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
  process.exit(1);
}
console.log("Reservation details live action e2e passed.");
