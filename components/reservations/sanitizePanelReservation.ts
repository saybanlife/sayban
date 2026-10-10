const PERSON_FIELDS = [
  "id",
  "name",
  "full_name",
  "first_name",
  "last_name",
  "mobile",
  "phone",
  "phone_number",
  "gender",
  "sex",
  "national_code",
  "national_id",
  "birth_date",
  "date_of_birth",
  "birthdate",
  "birthday",
  "date_birth",
  "city",
  "address",
  "full_address",
  "address_text",
  "details",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "lon",
  "relation",
  "relation_persian"
] as const;

const IDENTITY_KEYS = [
  "name",
  "full_name",
  "fullName",
  "first_name",
  "firstname",
  "firstName",
  "last_name",
  "lastname",
  "lastName",
  "mobile",
  "phone",
  "phone_number",
  "mobile_number",
  "national_code",
  "national_id",
  "nationalCode"
] as const;

const FLAT_IDENTITY_KEYS = [
  "patient_name",
  "patient_first_name",
  "patient_last_name",
  "patient_mobile",
  "patient_phone",
  "patient_national_code",
  "patient_national_id",
  "companion_name",
  "companion_first_name",
  "companion_last_name",
  "companion_mobile",
  "companion_phone",
  "companion_national_code",
  "companion_national_id",
  "booked_for_name",
  "booked_for_first_name",
  "booked_for_last_name",
  "user_name",
  "user_mobile",
  "user_phone",
  "user_national_code",
  "user_national_id"
] as const;

export type PanelReservationViewer = {
  role?: string | null;
  centerId?: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Home-care bookings wait for the user to pick a nurse. */
export function isNurseSelectionReservation(reservation: Record<string, unknown>) {
  const location = String(
    reservation.service_location ?? reservation.serviceLocation ?? ""
  )
    .trim()
    .toLowerCase();
  return location === "home";
}

function selectedStaffId(reservation: Record<string, unknown>): number | null {
  const staff = asRecord(reservation.staff);
  return (
    positiveId(reservation.staff_id) ||
    positiveId(reservation.staffId) ||
    positiveId(staff?.id)
  );
}

/** Center that owns the selected nurse (set on assign). */
function assignedCenterId(reservation: Record<string, unknown>): number | null {
  const staff = asRecord(reservation.staff);
  return (
    positiveId(staff?.center_id) ||
    positiveId(staff?.centerId) ||
    positiveId(reservation.staff_center_id) ||
    // Panel workflow writes the nurse's center onto the reservation row on assign.
    positiveId(reservation.center_id) ||
    positiveId(reservation.centerId)
  );
}

/** Decode panel JWT payload in the browser (no signature check — display-only). */
export function panelViewerFromToken(
  token: string | null | undefined
): PanelReservationViewer {
  if (!token) return {};
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const raw = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as Record<string, unknown>;
    const centerRaw = payload.center_id ?? payload.centerId;
    const centerId = Number(centerRaw);
    return {
      role: payload.role != null ? String(payload.role) : "",
      centerId: Number.isFinite(centerId) && centerId > 0 ? centerId : null
    };
  } catch {
    return {};
  }
}

/**
 * Home reservations hide name, mobile, and national id from every center
 * until a nurse is chosen. After that, only the nurse's center may see them.
 * Other reservation types are unchanged. Super admin is not a center.
 */
export function canRevealReservationIdentity(
  reservation: Record<string, unknown>,
  viewer?: PanelReservationViewer | null
): boolean {
  if (!isNurseSelectionReservation(reservation)) return true;
  if (String(viewer?.role || "") === "super_admin") return true;
  const staffId = selectedStaffId(reservation);
  const viewerCenterId = positiveId(viewer?.centerId);
  if (!staffId || !viewerCenterId) return false;
  return assignedCenterId(reservation) === viewerCenterId;
}

function omitIdentity(record: Record<string, unknown> | null) {
  if (!record) return record;
  const next = { ...record };
  for (const key of IDENTITY_KEYS) delete next[key];
  return next;
}

export function sanitizePanelReservationPerson(value: unknown) {
  const person = asRecord(value);
  if (!person) return null;
  return Object.fromEntries(
    PERSON_FIELDS.filter(key => person[key] !== undefined).map(key => [
      key,
      person[key]
    ])
  );
}

export function sanitizePanelReservation(
  value: unknown,
  viewer?: PanelReservationViewer | null
) {
  const reservation = asRecord(value);
  if (!reservation) return value;
  const reveal = canRevealReservationIdentity(reservation, viewer);
  const next: Record<string, unknown> = {
    ...reservation,
    user: sanitizePanelReservationPerson(reservation.user),
    patient: sanitizePanelReservationPerson(reservation.patient),
    companion: sanitizePanelReservationPerson(reservation.companion),
    booked_for: sanitizePanelReservationPerson(reservation.booked_for),
    patient_info: sanitizePanelReservationPerson(reservation.patient_info)
  };
  if (!reveal) {
    next.user = omitIdentity(asRecord(next.user));
    next.patient = omitIdentity(asRecord(next.patient));
    next.companion = omitIdentity(asRecord(next.companion));
    next.booked_for = omitIdentity(asRecord(next.booked_for));
    next.patient_info = omitIdentity(asRecord(next.patient_info));
    for (const key of FLAT_IDENTITY_KEYS) delete next[key];
  }
  return next;
}

export function sanitizePanelReservationsResponse(
  value: unknown,
  viewer?: PanelReservationViewer | null
) {
  const data = asRecord(value);
  if (!data) return value;
  if (Array.isArray(data.result)) {
    return {
      ...data,
      result: data.result.map(item => sanitizePanelReservation(item, viewer))
    };
  }
  if (Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map(item => sanitizePanelReservation(item, viewer))
    };
  }
  return data;
}
