import {
  effectiveReservationStatus,
  type ReservationRecord
} from "./reservationDetailsModel";

export type BookingTab = "active" | "completed";

const COMPLETED_STATUSES = new Set([
  "completed",
  "serviceFinished",
  "canceled",
  "cancelled",
  "rejected",
  "refunded",
  "userNoResponse",
  "contract_closed",
  "trial_stopped"
]);

function validReservationRows(value: unknown): ReservationRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ReservationRecord =>
      Boolean(
        item &&
          typeof item === "object" &&
          String((item as ReservationRecord).id ?? "").trim()
      )
  );
}

export function reservationRows(payload: unknown): ReservationRecord[] {
  if (Array.isArray(payload)) return validReservationRows(payload);
  if (!payload || typeof payload !== "object") return [];

  const root = payload as { result?: unknown; data?: unknown };
  if (Array.isArray(root.result)) return validReservationRows(root.result);
  if (Array.isArray(root.data)) return validReservationRows(root.data);
  if (root.data && typeof root.data === "object") {
    const nested = root.data as { result?: unknown };
    if (Array.isArray(nested.result)) {
      return validReservationRows(nested.result);
    }
  }
  return [];
}

export function bookingTabForReservation(
  reservation: ReservationRecord
): BookingTab {
  return COMPLETED_STATUSES.has(effectiveReservationStatus(reservation))
    ? "completed"
    : "active";
}

export function reservationsForBookingTab(
  reservations: readonly ReservationRecord[],
  tab: BookingTab
) {
  return reservations.filter(item => bookingTabForReservation(item) === tab);
}

/** Active/new booking count for footer badge (same rules as Booking «فعال»). */
export function countActiveBookings(payload: unknown): number {
  return reservationsForBookingTab(reservationRows(payload), "active").length;
}

export function formatBookingBadgeCount(count: number): string {
  const safe = Math.max(0, Math.floor(Number(count) || 0));
  if (safe > 99) return (99).toLocaleString("fa-IR") + "+";
  return safe.toLocaleString("fa-IR");
}
