/**
 * Resolve the person a reservation was made for.
 * Prefer patient/companion (همراه) over the account owner when present.
 */
export type ReservationPerson = {
  name?: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  phone?: string;
  gender?: string;
  national_code?: string;
  national_id?: string;
  birth_date?: string;
  address?: string;
  latitude?: number | string;
  longitude?: number | string;
  relation?: string;
  relation_persian?: string;
  isCompanion?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function pickName(raw: Record<string, unknown>) {
  const firstName = pickText(raw.first_name, raw.firstname, raw.firstName);
  const lastName = pickText(raw.last_name, raw.lastname, raw.lastName);
  return {
    firstName,
    lastName,
    name:
      pickText(raw.name, raw.full_name, raw.fullName) ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      undefined
  };
}

function pickAddress(raw: Record<string, unknown>) {
  const city = pickText(raw.city, raw.address_city);
  const address = pickText(
    raw.address,
    raw.full_address,
    raw.address_text,
    raw.user_address
  );
  if (city && address && !address.includes(city)) return `${city}، ${address}`;
  return address || city;
}

function pickPerson(raw: Record<string, unknown> | null): ReservationPerson | null {
  if (!raw) return null;
  const { name, firstName, lastName } = pickName(raw);
  const mobile = pickText(
    raw.mobile,
    raw.phone,
    raw.phone_number,
    raw.mobile_number
  );
  if (!name && !raw.id && !mobile) return null;
  const nationalCode = pickText(
    raw.national_code,
    raw.national_id,
    raw.nationalCode
  );
  return {
    name,
    first_name: firstName,
    last_name: lastName,
    mobile,
    phone: pickText(raw.phone, raw.mobile, raw.phone_number),
    gender: pickText(raw.gender, raw.sex),
    national_code: nationalCode,
    national_id: nationalCode,
    birth_date: pickText(
      raw.birth_date,
      raw.date_of_birth,
      raw.birthdate,
      raw.birthday,
      raw.date_birth
    ),
    address: pickAddress(raw),
    latitude: pickText(raw.latitude, raw.lat),
    longitude: pickText(raw.longitude, raw.lng, raw.lon),
    relation: pickText(raw.relation),
    relation_persian: pickText(raw.relation_persian, raw.relation)
  };
}

export function formatReservationGender(gender?: string) {
  const normalized = String(gender || "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (["female", "f", "woman", "زن", "خانم"].includes(normalized)) return "خانم";
  if (["male", "m", "man", "مرد", "آقا"].includes(normalized)) return "آقا";
  return gender;
}

export function formatReservationBirthDate(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const isoDate = /^\d{4}-\d{2}-\d{2}/.exec(raw)?.[0];
  if (!isoDate) return raw;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function resolveReservationDisplayPerson(
  currentItem: unknown
): ReservationPerson | null {
  const item = asRecord(currentItem);
  if (!item) return null;

  const reservationAddress = [
    pickText(item.user_address_title),
    pickText(item.user_address_city),
    pickText(item.user_address),
    pickText(item.user_address_details)
  ]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join("، ") || undefined;

  const reservationLatitude = pickText(
    item.user_address_latitude,
    item.user_address_lat,
    item.latitude
  );
  const reservationLongitude = pickText(
    item.user_address_longitude,
    item.user_address_lng,
    item.longitude
  );

  const owner = pickPerson(asRecord(item.user));
  const forUser =
    pickPerson(asRecord(item.for_user)) ||
    pickPerson(asRecord(item.booked_for_user)) ||
    pickPerson(asRecord(item.forUser));
  const patient =
    pickPerson(asRecord(item.patient)) ||
    pickPerson(asRecord(item.companion)) ||
    pickPerson(asRecord(item.booked_for)) ||
    pickPerson(asRecord(item.patient_info));

  const bookerId = Number(item.user_id);
  const forUserId = Number(
    item.for_user_id ?? asRecord(item.for_user)?.id ?? asRecord(item.booked_for_user)?.id
  );
  const forUserIsCompanion =
    Number.isFinite(forUserId) &&
    forUserId > 0 &&
    Number.isFinite(bookerId) &&
    bookerId > 0 &&
    forUserId !== bookerId;

  if (forUser && (forUserIsCompanion || patient)) {
    return {
      ...forUser,
      mobile: forUser.mobile || patient?.mobile || owner?.mobile,
      phone: forUser.phone || patient?.phone || owner?.phone,
      national_code:
        forUser.national_code || patient?.national_code || owner?.national_code,
      national_id:
        forUser.national_id || patient?.national_id || owner?.national_id,
      gender: forUser.gender || patient?.gender || owner?.gender,
      birth_date: forUser.birth_date || patient?.birth_date || owner?.birth_date,
      address:
        forUser.address ||
        patient?.address ||
        owner?.address ||
        reservationAddress,
      latitude:
        forUser.latitude ||
        patient?.latitude ||
        owner?.latitude ||
        reservationLatitude,
      longitude:
        forUser.longitude ||
        patient?.longitude ||
        owner?.longitude ||
        reservationLongitude,
      relation: forUser.relation || patient?.relation,
      relation_persian:
        forUser.relation_persian || patient?.relation_persian,
      isCompanion: true
    };
  }

  if (patient) {
    return {
      ...patient,
      mobile: patient.mobile || owner?.mobile,
      phone: patient.phone || owner?.phone,
      national_code: patient.national_code || owner?.national_code,
      national_id: patient.national_id || owner?.national_id,
      gender: patient.gender || owner?.gender,
      birth_date: patient.birth_date || owner?.birth_date,
      address: patient.address || owner?.address || reservationAddress,
      latitude:
        patient.latitude || owner?.latitude || reservationLatitude,
      longitude:
        patient.longitude || owner?.longitude || reservationLongitude,
      isCompanion: true
    };
  }

  if (forUser && !forUserIsCompanion) {
    return {
      ...forUser,
      address: forUser.address || owner?.address || reservationAddress,
      latitude: forUser.latitude || owner?.latitude || reservationLatitude,
      longitude: forUser.longitude || owner?.longitude || reservationLongitude,
      isCompanion: false
    };
  }

  const firstName = pickText(
    item.patient_first_name,
    item.companion_first_name,
    item.booked_for_first_name
  );
  const lastName = pickText(
    item.patient_last_name,
    item.companion_last_name,
    item.booked_for_last_name
  );
  const flatName =
    pickText(
      item.patient_name,
      item.companion_name,
      item.booked_for_name
    ) || [firstName, lastName].filter(Boolean).join(" ");

  if (flatName || item.patient_id) {
    return {
      name: flatName || owner?.name,
      first_name: firstName || owner?.first_name,
      last_name: lastName || owner?.last_name,
      mobile:
        pickText(item.patient_mobile, item.companion_mobile) || owner?.mobile,
      phone:
        pickText(item.patient_phone, item.companion_phone) || owner?.phone,
      gender:
        pickText(item.patient_gender, item.companion_gender) || owner?.gender,
      national_code:
        pickText(
          item.patient_national_code,
          item.companion_national_code,
          item.patient_national_id
        ) || owner?.national_code,
      national_id:
        pickText(
          item.patient_national_id,
          item.companion_national_id,
          item.patient_national_code
        ) || owner?.national_id,
      birth_date:
        pickText(
          item.patient_birth_date,
          item.companion_birth_date,
          item.patient_birthday
        ) || owner?.birth_date,
      address:
        pickText(
          item.patient_address,
          item.companion_address,
          item.user_address
        ) || owner?.address || reservationAddress,
      latitude:
        pickText(
          item.patient_latitude,
          item.companion_latitude,
          item.user_address_latitude
        ) || owner?.latitude || reservationLatitude,
      longitude:
        pickText(
          item.patient_longitude,
          item.companion_longitude,
          item.user_address_longitude
        ) || owner?.longitude || reservationLongitude,
      relation_persian: pickText(
        item.patient_relation,
        item.relation_persian,
        item.companion_relation
      ),
      isCompanion: true
    };
  }

  return owner
    ? {
        ...owner,
        address: owner.address || reservationAddress,
        latitude: owner.latitude || reservationLatitude,
        longitude: owner.longitude || reservationLongitude,
        isCompanion: false
      }
    : null;
}

export function withReservationDisplayUser<T extends Record<string, unknown>>(
  currentItem: T | null | undefined
): T | null | undefined {
  if (!currentItem) return currentItem;
  const person = resolveReservationDisplayPerson(currentItem);
  if (!person) return currentItem;
  const existingUser = asRecord(currentItem.user) || {};
  return {
    ...currentItem,
    user: {
      ...existingUser,
      name: person.name || existingUser.name,
      first_name: person.first_name || existingUser.first_name,
      last_name: person.last_name || existingUser.last_name,
      mobile: person.mobile || existingUser.mobile,
      phone: person.phone || existingUser.phone,
      gender: person.gender || existingUser.gender,
      national_code:
        person.national_code ||
        existingUser.national_code ||
        existingUser.national_id,
      national_id:
        person.national_id ||
        existingUser.national_id ||
        existingUser.national_code,
      birth_date: person.birth_date || existingUser.birth_date,
      address: person.address || existingUser.address,
      latitude: person.latitude || existingUser.latitude,
      longitude: person.longitude || existingUser.longitude,
      relation_persian: person.relation_persian,
      is_companion: person.isCompanion
    }
  };
}
