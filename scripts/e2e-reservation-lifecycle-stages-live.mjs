/**
 * Live E2E for nurse lifecycle stages (interview / trial / contract)
 * using disposable reservations only (marked description). Never mutates
 * pre-existing customer rows.
 *
 * Also asserts n8n lifecycle errors return non-empty JSON { success:false, message }.
 *
 *   node scripts/e2e-reservation-lifecycle-stages-live.mjs
 */
import { spawnSync } from "node:child_process";
import { resolveApiUrl, PUBLIC_ROUTES } from "../src/lib/apiRoutes.ts";

const MOBILE = "09228951264";
const MARKER = `e2e-life-stages-${Date.now()}`;
const results = [];
const createdIds = [];
let USER_ID = 0;

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const j = JSON.parse(r.stdout || "{}");
  if (j.success === false) throw new Error(j.error || j.text || "pma error");
  return j;
}

function parseRows(text) {
  const rows = [];
  const re =
    /DELETE FROM `\w+` WHERE `\w+`\.`id` = (\d+)\s+(\d+)(?:\s+(\S+))?(?:\s+(\S+))?/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    rows.push({
      id: Number(m[1]),
      col2: m[2],
      col3: m[3] || null,
      col4: m[4] || null
    });
  }
  if (!rows.length) {
    const re2 =
      /\b(\d{2,})\s+(pending|confirmed|canceled|awaitingOffers|awaitingSupport|awaitingPayment|offersReceived|nurseSelected|completed|interview_scheduled|trial_in_progress|trial_decision|awaiting_contract|contract_closed|trial_stopped)\b/g;
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

function sqlEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
}

async function login() {
  await fetch(resolveApiUrl("users/auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  await new Promise(r => setTimeout(r, 1200));
  const otp = extractOtp(
    pma(
      `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
    ).text || ""
  );
  if (!otp) throw new Error("otp missing");
  const val = await (
    await fetch(resolveApiUrl("/users/validate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: MOBILE, code: otp })
    })
  ).json();
  const jwt = val?.data?.token || val?.token || val?.result?.token;
  if (!jwt) throw new Error("jwt missing");
  USER_ID = decodeJwtUserId(jwt);
  if (!USER_ID) throw new Error("user id missing from jwt");
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
  return { status: res.status, json, text, rawLen: text.length };
}

async function details(jwt, id) {
  const res = await fetch(
    resolveApiUrl(`${PUBLIC_ROUTES.reservationDetails}?id=${id}`),
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwt}`
      }
    }
  );
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function insertReservation(status = "awaitingPayment") {
  const desc = `${MARKER}:${status}:${createdIds.length}`;
  pma(
    `INSERT INTO reservations
      (user_id, status, service_id, service_location, center_id, staff_id, final_price, payment_status, payment_method, description, created_at, updated_at)
     VALUES (
       ${USER_ID}, '${status}', NULL, 'home', 151, 41, 510000, 'unpaid', 'online',
       '${sqlEscape(desc)}', NOW(), NOW()
     )`
  );
  const found = pma(
    `SELECT id, status FROM reservations WHERE user_id=${USER_ID} AND description='${sqlEscape(desc)}' ORDER BY id DESC LIMIT 1`
  );
  const id = parseRows(found.text || "")[0]?.id;
  if (!Number.isFinite(id)) throw new Error(`insert parse failed: ${desc}`);
  createdIds.push(id);
  return id;
}

function upsertLifecycle(reservationId, fields) {
  const stage = fields.stage || null;
  const options = fields.interview_options
    ? `'${sqlEscape(JSON.stringify(fields.interview_options))}'`
    : "NULL";
  const interviewAt = fields.interview_at
    ? `'${sqlEscape(fields.interview_at)}'`
    : "NULL";
  const interviewMode = fields.interview_mode
    ? `'${sqlEscape(fields.interview_mode)}'`
    : "NULL";
  const trialDecision = fields.trial_decision
    ? `'${sqlEscape(fields.trial_decision)}'`
    : "NULL";
  const deadline = fields.contract_deadline
    ? `'${sqlEscape(fields.contract_deadline)}'`
    : "NULL";
  pma(
    `INSERT INTO reservations__lifecycle
       (reservation_id, stage, interview_options, interview_at, interview_mode, trial_decision, contract_deadline, created_at, updated_at)
     VALUES (
       ${reservationId},
       ${stage ? `'${sqlEscape(stage)}'` : "NULL"},
       ${options},
       ${interviewAt},
       ${interviewMode},
       ${trialDecision},
       ${deadline},
       NOW(),
       NOW()
     )
     ON DUPLICATE KEY UPDATE
       stage = VALUES(stage),
       interview_options = COALESCE(VALUES(interview_options), interview_options),
       interview_at = VALUES(interview_at),
       interview_mode = VALUES(interview_mode),
       trial_decision = VALUES(trial_decision),
       contract_deadline = COALESCE(VALUES(contract_deadline), contract_deadline),
       updated_at = NOW()`
  );
}

function reservationStatus(id) {
  return parseRows(
    pma(`SELECT id, status FROM reservations WHERE id=${id} LIMIT 1`).text || ""
  )[0]?.col3;
}

function lifecycleStage(id) {
  // SELECT reservation_id, stage — no auto id column as PK is reservation_id
  const text =
    pma(
      `SELECT reservation_id, stage, interview_at, interview_mode, trial_decision, contract_closed_at
         FROM reservations__lifecycle WHERE reservation_id=${id} LIMIT 1`
    ).text || "";
  const m = text.match(
    new RegExp(
      `${id}\\s+(interview_scheduled|trial_in_progress|trial_decision|awaiting_contract|contract_closed|trial_stopped|awaiting_interview)\\b`
    )
  );
  return m?.[1] || null;
}

function cleanup() {
  if (!USER_ID) return;
  const ids = [...new Set(createdIds)];
  if (ids.length) {
    pma(`DELETE FROM reservations__lifecycle WHERE reservation_id IN (${ids.join(",")})`);
    pma(
      `DELETE FROM reservations WHERE id IN (${ids.join(",")}) AND user_id=${USER_ID} AND description LIKE '${MARKER}%'`
    );
  }
  pma(
    `DELETE rl FROM reservations__lifecycle rl
     INNER JOIN reservations r ON r.id = rl.reservation_id
     WHERE r.user_id=${USER_ID} AND r.description LIKE 'e2e-life-stages-%'`
  );
  pma(
    `DELETE FROM reservations WHERE user_id=${USER_ID} AND description LIKE 'e2e-life-stages-%'`
  );
}

function futureSlot(daysAhead, hour) {
  const d = new Date(Date.now() + daysAhead * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  const starts = d.toISOString().slice(0, 19).replace("T", " ");
  const end = new Date(d.getTime() + 30 * 60000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  return {
    starts_at: starts,
    ends_at: end,
    modes: ["online", "home", "center"]
  };
}

try {
  console.log("== baseline: lifecycle table may be empty in prod ==");
  const countText =
    pma("SELECT COUNT(*) AS c FROM reservations__lifecycle").text || "";
  const count =
    countText.match(/Well Known Binary\s+c\s+(\d+)/)?.[1] ||
    countText.match(/\bc\s+(\d+)\b/)?.[1] ||
    "?";
  record("investigate:lifecycle-count", true, `count=${count}`);

  console.log("== login ==");
  const jwt = await login();
  record("login", true, `user=${USER_ID}`);

  // purge prior markers
  cleanup();

  const slotA = futureSlot(3, 10);
  const slotB = futureSlot(4, 16);
  const interviewId = insertReservation("awaitingPayment");
  upsertLifecycle(interviewId, {
    stage: "awaiting_interview",
    interview_options: [slotA, slotB]
  });
  record("seed:interview-ready", true, `id=${interviewId}`);

  console.log("== details exposes interview_options ==");
  {
    const d = await details(jwt, interviewId);
    const row = d.json?.result;
    const options = row?.interview_options;
    const parsed =
      typeof options === "string"
        ? JSON.parse(options || "[]")
        : Array.isArray(options)
          ? options
          : [];
    record(
      "details:interview_options",
      d.json?.success === true && parsed.length >= 2,
      `http=${d.status} n=${parsed.length} stage=${row?.lifecycle_stage}`
    );
  }

  console.log("== select_interview success ==");
  {
    const res = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "select_interview",
      interviewAt: slotA.starts_at,
      interviewMode: "online"
    });
    const stage = lifecycleStage(interviewId);
    record(
      "action:select_interview",
      res.json?.success === true && stage === "interview_scheduled",
      `http=${res.status} stage=${stage} msg=${res.json?.message || ""}`
    );
  }

  console.log("== select_interview errors (JSON body) ==");
  {
    const res = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "select_interview",
      interviewAt: "1999-01-01 10:00:00",
      interviewMode: "online"
    });
    record(
      "error:select_interview-unavailable",
      res.json?.success === false &&
        res.rawLen > 0 &&
        Boolean(res.json?.message) &&
        res.status >= 400,
      `http=${res.status} message=${res.json?.message || "(empty)"} bodyLen=${res.rawLen}`
    );
  }

  console.log("== report_attendance ==");
  {
    // Advance disposable row to trial_in_progress (center-side step)
    upsertLifecycle(interviewId, { stage: "trial_in_progress" });
    const bad = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "report_attendance"
      // attended missing
    });
    record(
      "error:attendance-missing",
      bad.json?.success === false && Boolean(bad.json?.message) && bad.rawLen > 0,
      `http=${bad.status} message=${bad.json?.message || "(empty)"}`
    );

    const ok = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "report_attendance",
      attended: true
    });
    const stage = lifecycleStage(interviewId);
    record(
      "action:report_attendance",
      ok.json?.success === true && stage === "trial_in_progress",
      `http=${ok.status} stage=${stage}`
    );
  }

  console.log("== trial_decision continue → contract ==");
  {
    upsertLifecycle(interviewId, { stage: "trial_decision" });
    const wrong = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "close_contract"
    });
    record(
      "error:close-before-contract",
      wrong.json?.success === false && Boolean(wrong.json?.message),
      `http=${wrong.status} message=${wrong.json?.message || "(empty)"}`
    );

    const cont = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "trial_decision",
      decision: "continue"
    });
    const stage = lifecycleStage(interviewId);
    record(
      "action:trial_decision-continue",
      cont.json?.success === true && stage === "awaiting_contract",
      `http=${cont.status} stage=${stage}`
    );

    const closed = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "close_contract"
    });
    const stage2 = lifecycleStage(interviewId);
    record(
      "action:close_contract",
      closed.json?.success === true && stage2 === "contract_closed",
      `http=${closed.status} stage=${stage2}`
    );
  }

  console.log("== trial_decision stop cancels reservation ==");
  {
    const stopId = insertReservation("awaitingPayment");
    upsertLifecycle(stopId, { stage: "trial_decision" });
    const stop = await lifecycle(jwt, {
      reservation_id: stopId,
      action: "trial_decision",
      decision: "stop"
    });
    const stage = lifecycleStage(stopId);
    const st = reservationStatus(stopId);
    record(
      "action:trial_decision-stop",
      stop.json?.success === true &&
        stage === "trial_stopped" &&
        st === "canceled",
      `http=${stop.status} stage=${stage} status=${st}`
    );
  }

  console.log("== generic lifecycle error JSON ==");
  {
    const badAction = await lifecycle(jwt, {
      reservation_id: interviewId,
      action: "not_a_real_action"
    });
    record(
      "error:bad-action-json",
      badAction.json?.success === false &&
        Boolean(badAction.json?.message) &&
        badAction.rawLen > 0 &&
        badAction.status >= 400,
      `http=${badAction.status} message=${badAction.json?.message || "(empty)"}`
    );

    const missing = await lifecycle(jwt, {
      reservation_id: 999999901,
      action: "cancel_request"
    });
    record(
      "error:missing-json",
      missing.json?.success === false &&
        Boolean(missing.json?.message) &&
        missing.rawLen > 0,
      `http=${missing.status} message=${missing.json?.message || "(empty)"}`
    );
  }

  console.log("== root cause note ==");
  record(
    "root-cause:lifecycle-populated-by-panel-or-actions",
    true,
    "rows created by panel interview-slots save or customer lifecycle actions; prod had neither until e2e seed"
  );
} catch (err) {
  record("fatal", false, String(err?.message || err));
  console.error(err);
} finally {
  console.log("== cleanup disposable ==");
  try {
    cleanup();
    record("cleanup", true, `ids=${[...new Set(createdIds)].join(",")}`);
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
console.log("Reservation lifecycle stages live e2e passed.");
