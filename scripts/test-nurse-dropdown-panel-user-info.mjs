import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const importTs = async relative => {
  const output = ts.transpileModule(read(relative), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
};

const model = await importTs(
  "components/reservations/reservationDisplayPerson.ts"
);
const companion = model.resolveReservationDisplayPerson({
  patient: {
    first_name: "نگار",
    last_name: "احمدی",
    mobile: "09121234567",
    gender: "female",
    national_code: "0012345678",
    birth_date: "1992-04-13",
    city: "تهران",
    address: "خیابان ولیعصر"
  },
  user: { name: "مالک حساب", mobile: "09999999999" }
});
assert.deepEqual(
  {
    name: companion.name,
    mobile: companion.mobile,
    gender: model.formatReservationGender(companion.gender),
    nationalCode: companion.national_code,
    address: companion.address,
    companion: companion.isCompanion
  },
  {
    name: "نگار احمدی",
    mobile: "09121234567",
    gender: "خانم",
    nationalCode: "0012345678",
    address: "تهران، خیابان ولیعصر",
    companion: true
  }
);
assert.notEqual(
  model.formatReservationBirthDate(companion.birth_date),
  companion.birth_date
);

const flat = model.resolveReservationDisplayPerson({
  patient_id: 8,
  patient_first_name: "علی",
  patient_last_name: "رضایی",
  patient_phone: "02112345678",
  patient_gender: "male",
  patient_national_id: "1234567890",
  patient_birthday: "1400/01/02",
  patient_address: "کرج"
});
assert.equal(flat.name, "علی رضایی");
assert.equal(flat.phone, "02112345678");
assert.equal(model.formatReservationGender(flat.gender), "آقا");
assert.equal(flat.birth_date, "1400/01/02");
assert.equal(flat.address, "کرج");

const enriched = model.withReservationDisplayUser({
  id: 9,
  user: { name: "کاربر", birth_date: "1990-01-01", address: "قم" }
});
assert.equal(enriched.user.birth_date, "1990-01-01");
assert.equal(enriched.user.address, "قم");

const selectedAddress = model.resolveReservationDisplayPerson({
  user: { id: 3, name: "کاربر" },
  user_address_title: "منزل",
  user_address_city: "تهران",
  user_address: "خیابان آزادی",
  user_address_details: "پلاک ۱۲"
});
assert.equal(
  selectedAddress.address,
  "منزل، تهران، خیابان آزادی، پلاک ۱۲"
);

const centerOffers = read("components/CenterOffers.tsx");
assert.match(centerOffers, /label: "مراقب", value: "general"/);
assert.match(centerOffers, /label: "پرستار", value: "specialized"/);
assert.match(centerOffers, /onChange=\{renderProps\.onChange\}/);
assert.match(centerOffers, /FragmentSelect/);

const userInfo = read("components/reservations/PanelReservationUserInfo.tsx");
for (const label of [
  "نام و نام خانوادگی",
  "شماره تماس",
  "جنسیت",
  "کد ملی",
  "تاریخ تولد",
  "آدرس"
]) {
  assert.match(userInfo, new RegExp(label));
}
assert.match(userInfo, /identityHidden/);
assert.match(userInfo, /canRevealReservationIdentity/);
assert.match(userInfo, /\.filter\(field => Boolean/);

const mainPageReservations = read("components/MainPageReservations.tsx");
assert.match(mainPageReservations, /render:\s*\(renderProps/);
assert.match(mainPageReservations, /\/api\/panel\/reservations\//);
assert.doesNotMatch(mainPageReservations, /props:\s*\{\s*url:/);

const reservationItem = read("components/ReservationItem.tsx");
assert.match(reservationItem, /sanitizePanelReservation/);
assert.match(reservationItem, /panelViewerFromToken/);

const panelCss = read(
  "components/reservations/PanelReservationUserInfo.module.css"
);
assert.match(panelCss, /grid-template-columns:\s*repeat\(2/);
assert.match(panelCss, /@media \(max-width:\s*640px\)/);
assert.match(panelCss, /grid-template-columns:\s*1fr/);

const sanitizer = await importTs(
  "components/reservations/sanitizePanelReservation.ts"
);
const safeResponse = sanitizer.sanitizePanelReservationsResponse({
  success: true,
  result: [
    {
      id: 10,
      user: {
        id: 2,
        name: "کاربر",
        mobile: "09120000000",
        birth_date: "1990-01-01",
        address: "تهران",
        password: "must-not-leak",
        reset_token: "must-not-leak"
      }
    }
  ]
});
assert.equal(safeResponse.result[0].user.name, "کاربر");
assert.equal(safeResponse.result[0].user.birth_date, "1990-01-01");
assert.equal(safeResponse.result[0].user.address, "تهران");
assert.equal("password" in safeResponse.result[0].user, false);
assert.equal("reset_token" in safeResponse.result[0].user, false);

const hidden = sanitizer.sanitizePanelReservationsResponse(
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
        patient_name: "همراه",
        patient_mobile: "09121111111"
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

const otherCenter = sanitizer.sanitizePanelReservationsResponse(
  {
    result: [
      {
        service_location: "home",
        staff_id: 26,
        center_id: 108,
        user: { name: "مریم", mobile: "09123333333", national_code: "1234567890" }
      }
    ]
  },
  { role: "center_admin", centerId: 144 }
);
assert.equal(otherCenter.result[0].user.name, undefined);
assert.equal(otherCenter.result[0].user.mobile, undefined);

const ownerCenter = sanitizer.sanitizePanelReservationsResponse(
  {
    result: [
      {
        service_location: "home",
        staff_id: 26,
        center_id: 108,
        user: { name: "مریم", mobile: "09123333333", national_code: "1234567890" }
      }
    ]
  },
  { role: "center_admin", centerId: 108 }
);
assert.equal(ownerCenter.result[0].user.name, "مریم");
assert.equal(ownerCenter.result[0].user.mobile, "09123333333");
assert.equal(ownerCenter.result[0].user.national_code, "1234567890");

const visit = sanitizer.sanitizePanelReservationsResponse(
  {
    result: [
      {
        service_location: "center",
        staff_id: null,
        user: { name: "بازدید", mobile: "02112345678", national_code: "1111111111" }
      }
    ]
  },
  { role: "center_admin", centerId: 108 }
);
assert.equal(visit.result[0].user.name, "بازدید");
assert.equal(visit.result[0].user.mobile, "02112345678");
assert.equal(visit.result[0].user.national_code, "1111111111");

const workflowPatch = read(
  "scripts/patch-panel-reservation-user-address.mjs"
);
assert.match(workflowPatch, /--revert/);
assert.match(workflowPatch, /scripts", "backup"/);
assert.match(workflowPatch, /LEFT JOIN users__addresses ua/);
assert.match(workflowPatch, /workflow verification failed/);

console.log("Nurse service dropdown and panel reservation user-info tests passed.");
