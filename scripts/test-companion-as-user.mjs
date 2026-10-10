/**
 *   node scripts/test-companion-as-user.mjs
 */
import assert from "node:assert/strict";
import {
  buildCompanionBookingFields,
  companionForUserId,
  companionPatientId,
  isPrimaryAccountUser,
  resolveReservationForUserId
} from "../components/user/companionUserModel.ts";
import { resolveReservationDisplayPerson } from "../components/reservations/reservationDisplayPerson.ts";
import { buildReservationPayload } from "../components/reservation/visitBooking.ts";

assert.equal(isPrimaryAccountUser({}), true);
assert.equal(isPrimaryAccountUser({ parent_user_id: null }), true);
assert.equal(isPrimaryAccountUser({ parent_user_id: 12 }), false);
assert.equal(isPrimaryAccountUser({ can_login: 0 }), false);

const companion = { id: 35, linked_user_id: 200, for_user_id: 200 };
assert.equal(companionPatientId(companion), 35);
assert.equal(companionForUserId(companion), 200);

assert.deepEqual(
  buildCompanionBookingFields({ forSelf: true, bookerUserId: 9 }),
  { patient_id: null, for_user_id: 9 }
);
assert.deepEqual(buildCompanionBookingFields({ companion }), {
  patient_id: 35,
  for_user_id: 200
});

assert.equal(
  resolveReservationForUserId({
    bookerUserId: 9,
    patientId: null
  }),
  9
);
assert.equal(
  resolveReservationForUserId({
    bookerUserId: 9,
    forUserId: 200,
    patientId: 35
  }),
  200
);

const legacy = resolveReservationDisplayPerson({
  user_id: 9,
  patient_id: 35,
  user: { id: 9, name: "مادر", mobile: "09120000000" },
  patient: { id: 35, name: "فرزند", relation_persian: "فرزند" }
});
assert.equal(legacy?.name, "فرزند");
assert.equal(legacy?.isCompanion, true);

const modern = resolveReservationDisplayPerson({
  user_id: 9,
  for_user_id: 200,
  user: { id: 9, name: "مادر", mobile: "09120000000" },
  for_user: { id: 200, name: "فرزند جدید", national_code: "001" },
  patient: { id: 35, name: "فرزند قدیمی" }
});
assert.equal(modern?.name, "فرزند جدید");
assert.equal(modern?.isCompanion, true);

const selfBooking = resolveReservationDisplayPerson({
  user_id: 9,
  for_user_id: 9,
  user: { id: 9, name: "مادر" },
  for_user: { id: 9, name: "مادر" }
});
assert.equal(selfBooking?.name, "مادر");
assert.equal(selfBooking?.isCompanion, false);

const payload = buildReservationPayload({
  centerId: "abc",
  service: { id: 1, final_price: 100 },
  date: "2026-10-05",
  slot: { slot_start: "10:00", slot_end: "11:00" },
  patientId: 35,
  forUserId: 200
});
assert.equal(payload?.patient_id, 35);
assert.equal(payload?.for_user_id, 200);

console.log("companion-as-user checks passed");
