import { bookingTabForReservation } from "../reservation/bookingTabs";
import type { ReservationRecord } from "../reservation/reservationDetailsModel";
import { visitNeedsPostVisitHomeStatus } from "../reservation/visitPostVisitModel";

/** Home «وضعیت» visibility: active flows + completed visit awaiting feedback. */
export function isActiveHomeReservationExtended(
  reservation: ReservationRecord
): boolean {
  if (visitNeedsPostVisitHomeStatus(reservation)) return true;
  return bookingTabForReservation(reservation) === "active";
}
