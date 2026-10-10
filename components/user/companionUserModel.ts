/**
 * Companion-as-user helpers.
 * Legacy companion rows stay in users__patient (id = patient_id for APIs).
 * New model also creates users with parent_user_id = owner.
 */

export type CompanionUserLike = {
  id?: number | string | null;
  linked_user_id?: number | string | null;
  for_user_id?: number | string | null;
  user_id?: number | string | null;
  parent_user_id?: number | string | null;
  is_main_user?: boolean | number | null;
};

export function isPrimaryAccountUser(user: {
  parent_user_id?: unknown;
  can_login?: unknown;
}): boolean {
  const parent = Number(user.parent_user_id);
  if (Number.isInteger(parent) && parent > 0) return false;
  if (user.can_login === 0 || user.can_login === false || user.can_login === "0") {
    return false;
  }
  return true;
}

export function normalizePositiveId(value: unknown): number | null {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

/** Legacy patients API id (users__patient.id) for booking payloads. */
export function companionPatientId(companion: CompanionUserLike | null | undefined): number | null {
  return normalizePositiveId(companion?.id);
}

/**
 * User id the reservation is for:
 * - companion.linked_user_id / for_user_id when present
 * - else null (caller should fall back to booker user id / patient bridge)
 */
export function companionForUserId(
  companion: CompanionUserLike | null | undefined
): number | null {
  return (
    normalizePositiveId(companion?.linked_user_id) ||
    normalizePositiveId(companion?.for_user_id) ||
    null
  );
}

export function resolveReservationForUserId(input: {
  bookerUserId?: unknown;
  forUserId?: unknown;
  patientId?: unknown;
  companionLinkedUserId?: unknown;
}): number | null {
  const explicit = normalizePositiveId(input.forUserId);
  if (explicit) return explicit;
  const linked = normalizePositiveId(input.companionLinkedUserId);
  if (linked) return linked;
  const patientId = normalizePositiveId(input.patientId);
  if (patientId) return null; // unresolved until server maps patient → linked user
  return normalizePositiveId(input.bookerUserId);
}

export function buildCompanionBookingFields(input: {
  bookerUserId?: unknown;
  companion?: CompanionUserLike | null;
  forSelf?: boolean;
}): {
  patient_id: number | null;
  for_user_id: number | null;
} {
  if (input.forSelf || !input.companion) {
    return {
      patient_id: null,
      for_user_id: normalizePositiveId(input.bookerUserId)
    };
  }
  return {
    patient_id: companionPatientId(input.companion),
    for_user_id:
      companionForUserId(input.companion) ||
      normalizePositiveId(input.bookerUserId)
  };
}
