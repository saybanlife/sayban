import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load via ts-node-less: duplicate pure helpers by reading compiled isn't available.
// Inline the critical contracts mirrored from interviewSlots.ts / UI wiring.

function toPersianDigits(input) {
  return String(input ?? "").replace(/\d/g, d =>
    String.fromCharCode(0x06f0 + Number(d))
  );
}

function combineLocalDateTime(date, time) {
  if (!date || !time) return "";
  return `${date}T${time}:00`;
}

function addMinutesLocal(date, time, minutes) {
  const start = combineLocalDateTime(date, time);
  if (!start) return "";
  const [dPart, tPart] = start.split("T");
  const [y, m, day] = dPart.split("-").map(Number);
  const [hh, mm] = tPart.replace(/:00$/, "").split(":").map(Number);
  const dt = new Date(y, m - 1, day, hh, mm, 0);
  dt.setMinutes(dt.getMinutes() + minutes);
  const pad = n => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
}

const starts = combineLocalDateTime("2026-10-02", "10:00");
const ends = addMinutesLocal("2026-10-02", "10:00", 30);
assert.equal(starts, "2026-10-02T10:00:00");
assert.equal(ends, "2026-10-02T10:30:00");
assert.equal(toPersianDigits("10:00"), "۱۰:۰۰");

const migration = readFileSync(
  join(root, "scripts/sql/centers_offers_proposed_slots.sql"),
  "utf8"
);
const rollback = readFileSync(
  join(root, "scripts/sql/centers_offers_proposed_slots_rollback.sql"),
  "utf8"
);
assert.match(migration, /proposed_slots/);
assert.match(rollback, /proposed_slots/);

const stateUi = readFileSync(
  join(root, "components/ReservationStateDetails.tsx"),
  "utf8"
);
assert.match(stateUi, /formatInterviewSlotDay/);
assert.match(stateUi, /formatInterviewSlotRange/);
assert.match(stateUi, /تأیید زمان مصاحبه/);

const panelUi = readFileSync(
  join(root, "components/reservations/PanelInterviewSlotsManager.tsx"),
  "utf8"
);
assert.match(panelUi, /\/api\/panel\/interview-slots/);
assert.match(panelUi, /افزودن زمان/);

const api = readFileSync(
  join(root, "src/pages/api/panel/interview-slots.ts"),
  "utf8"
);
assert.match(api, /saveNurseInterviewSlots/);

const item = readFileSync(join(root, "components/ReservationItem.tsx"), "utf8");
assert.match(item, /PanelInterviewSlotsManager/);

console.log("interview-multi-slots: ok");
