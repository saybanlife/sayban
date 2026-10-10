import {
  reservationFlow,
  type ReservationRecord
} from "../reservation/reservationDetailsModel";
import { isActiveHomeReservation } from "./homeStatusCardModel";

function reservationRows(payload: unknown): ReservationRecord[] {
  if (Array.isArray(payload)) return payload as ReservationRecord[];
  if (!payload || typeof payload !== "object") return [];

  const root = payload as {
    result?: unknown;
    data?: unknown;
  };
  if (Array.isArray(root.result)) return root.result as ReservationRecord[];
  if (Array.isArray(root.data)) return root.data as ReservationRecord[];
  if (root.data && typeof root.data === "object") {
    const nested = root.data as { result?: unknown };
    if (Array.isArray(nested.result)) {
      return nested.result as ReservationRecord[];
    }
  }
  return [];
}

function parsedTime(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function numericId(value: unknown): number | null {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function isNewer(candidate: ReservationRecord, current: ReservationRecord) {
  const candidateCreated = parsedTime(candidate.created_at);
  const currentCreated = parsedTime(current.created_at);
  if (candidateCreated !== null && currentCreated !== null) {
    return candidateCreated > currentCreated;
  }

  const candidateId = numericId(candidate.id);
  const currentId = numericId(current.id);
  if (candidateId !== null && currentId !== null && candidateId !== currentId) {
    return candidateId > currentId;
  }

  const candidateStart = parsedTime(candidate.start_time);
  const currentStart = parsedTime(current.start_time);
  if (candidateStart !== null && currentStart !== null) {
    return candidateStart > currentStart;
  }

  return candidateCreated !== null && currentCreated === null;
}

function isHomeStatusFlow(reservation: ReservationRecord) {
  const flow = reservationFlow(reservation);
  return flow === "nurse" || flow === "visit";
}

/**
 * Active nurse + visit reservations for Home «وضعیت», newest first.
 * Ordinary service bookings stay out of this section.
 */
export function selectLatestHomeReservations(
  payload: unknown
): ReservationRecord[] {
  const selected = reservationRows(payload).filter(reservation => {
    if (!reservation || typeof reservation !== "object" || !reservation.id) {
      return false;
    }
    if (!isActiveHomeReservation(reservation)) return false;
    return isHomeStatusFlow(reservation);
  });

  return selected.sort((a, b) => {
    if (isNewer(a, b)) return -1;
    if (isNewer(b, a)) return 1;
    return 0;
  });
}
