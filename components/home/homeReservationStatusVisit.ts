import type { ReservationRecord } from "../reservation/reservationDetailsModel";
import { reservationFlow } from "../reservation/reservationDetailsModel";
import { isActiveHomeReservationExtended } from "./homeActiveReservation";

function reservationRows(payload: unknown): ReservationRecord[] {
  if (Array.isArray(payload)) return payload as ReservationRecord[];
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { result?: unknown; data?: unknown };
  if (Array.isArray(root.result)) return root.result as ReservationRecord[];
  if (Array.isArray(root.data)) return root.data as ReservationRecord[];
  return [];
}

function isHomeStatusFlow(reservation: ReservationRecord) {
  const flow = reservationFlow(reservation);
  return flow === "nurse" || flow === "visit";
}

/** Same as homeReservationStatus.selectLatestHomeReservations but keeps ended visit until review. */
export function selectLatestHomeReservationsWithVisitPostVisit(
  payload: unknown
): ReservationRecord[] {
  const selected = reservationRows(payload).filter(reservation => {
    if (!reservation?.id) return false;
    if (!isActiveHomeReservationExtended(reservation)) return false;
    return isHomeStatusFlow(reservation);
  });
  return selected.sort((a, b) => {
    const ca = Date.parse(String(a.created_at || ""));
    const cb = Date.parse(String(b.created_at || ""));
    if (Number.isFinite(ca) && Number.isFinite(cb) && ca !== cb) {
      return cb - ca;
    }
    return Number(b.id) - Number(a.id);
  });
}
