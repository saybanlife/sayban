/** Canonical consumer routes opened from BookingCreateMenu. */
export const BOOKING_CREATE_ROUTES = {
  /** Nurse / caregiver request wizard (CenterOffers). */
  nurse: "/home/bookNurse/",
  /** Center visit browse — «پذیرش و بستری» category slug. */
  centerVisit: `/home/${encodeURIComponent("Intake & Admissions")}/`,
  /** Medication reminder setup under the reminder shell. */
  reminder: "/reminder/"
} as const;

export type BookingCreateRoute =
  (typeof BOOKING_CREATE_ROUTES)[keyof typeof BOOKING_CREATE_ROUTES];
