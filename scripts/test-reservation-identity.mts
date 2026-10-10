import assert from "node:assert/strict";
import {
  panelViewerFromToken,
  sanitizePanelReservation,
  sanitizePanelReservationsResponse
} from "../components/reservations/sanitizePanelReservation";

const hidden = sanitizePanelReservationsResponse(
  {
    result: [
      {
        service_location: "home",
        staff_id: null,
        center_id: 108,
        user: {
          name: "کاربر مخفی",
          mobile: "09120000000",
          national_code: "0012345678",
          gender: "female",
          address: "تهران"
        },
        patient_name: "همراه"
      }
    ]
  },
  { role: "center_admin", centerId: 108 }
);
assert.equal(hidden.result[0].user.name, undefined);
assert.equal(hidden.result[0].user.mobile, undefined);
assert.equal(hidden.result[0].user.national_code, undefined);
assert.equal(hidden.result[0].user.gender, "female");
assert.equal(hidden.result[0].user.address, "تهران");
assert.equal("patient_name" in hidden.result[0], false);

const other = sanitizePanelReservationsResponse(
  {
    result: [
      {
        service_location: "home",
        staff_id: 26,
        center_id: 108,
        user: { name: "مریم", mobile: "0912", national_code: "1" }
      }
    ]
  },
  { role: "center_admin", centerId: 144 }
);
assert.equal(other.result[0].user.name, undefined);

const own = sanitizePanelReservationsResponse(
  {
    result: [
      {
        service_location: "home",
        staff_id: 26,
        center_id: 108,
        user: { name: "مریم", mobile: "0912", national_code: "1" }
      }
    ]
  },
  { role: "center_admin", centerId: 108 }
);
assert.equal(own.result[0].user.name, "مریم");
assert.equal(own.result[0].user.mobile, "0912");

const visit = sanitizePanelReservationsResponse(
  {
    result: [
      {
        service_location: "center",
        user: { name: "بازدید", mobile: "021", national_code: "111" }
      }
    ]
  },
  { role: "center_admin", centerId: 108 }
);
assert.equal(visit.result[0].user.name, "بازدید");
assert.equal(visit.result[0].user.national_code, "111");

const single = sanitizePanelReservation(
  {
    service_location: "home",
    staff_id: null,
    user: { name: "X", mobile: "0912", national_code: "9", gender: "male" }
  },
  { role: "center_admin", centerId: 108 }
) as { user: { name?: string; gender?: string } };
assert.equal(single.user.name, undefined);
assert.equal(single.user.gender, "male");

const payload = Buffer.from(
  JSON.stringify({ role: "center_admin", center_id: 108 })
).toString("base64url");
const viewer = panelViewerFromToken(`x.${payload}.y`);
assert.equal(viewer.role, "center_admin");
assert.equal(viewer.centerId, 108);

console.log("reservation-identity: ok");
