import { PUBLIC_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";

/** Canonical webhook URL for GET reservation details (owner JWT). */
export function reservationDetailsUrl(reservationId: string | number): string {
  return resolveApiUrl(
    `${PUBLIC_ROUTES.reservationDetails}?id=${encodeURIComponent(String(reservationId))}`
  );
}

/** Canonical webhook URL for POST lifecycle status actions (owner JWT). */
export function reservationLifecycleUrl(): string {
  return resolveApiUrl(PUBLIC_ROUTES.reservationLifecycle);
}
