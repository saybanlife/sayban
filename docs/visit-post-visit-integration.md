# Visit post–visit (contract + center review)

## New routes & components

- `/reservation-center-review/[id]` — center review form (signed / unsigned variants).
- `HomeStatusCardNext` + `ItemBookingNext` — Home «وضعیت» card with contract step + review CTA.
- `ReservationVisitPostVisitDetails` — details-page block (import into `ReservationStateDetails` when visit ended).

## Wiring (manual if files were locked)

1. **Home list:** In `HomeHighRatedCenters.tsx`, import `ItemBookingNext` instead of `ItemBooking`.
2. **Home filter:** Use `selectLatestHomeReservationsWithVisitPostVisit` from `homeReservationStatusVisit.ts` wherever Home status reservations are selected (same call sites as `selectLatestHomeReservations`).
3. **Details:** In `ReservationStateDetails.tsx`, render `<ReservationVisitPostVisitDetails reservation={...} token={...} onChange={...} busy={busy} />` when `flow === "visit"` (before or instead of the generic `visitDone` block).
4. **API:** In `src/pages/api/reservations/[id].ts`, use `getReservationDetailsEnriched` for GET and route `visit_contract_feedback` to `applyVisitContractFeedback` (see `reservationVisitPostVisitService.ts`).
5. **DB:** Run `scripts/sql/reservation_visit_post_visit.sql` on production when ready.

## Fix corrupted lifecycle SQL line

If `reservationLifecycleService.ts` line 73 contains literal `` `r`n ``, replace it with real newlines and add `rl.visit_post_visit_meta,` — or rely on `reservationVisitPostVisitService.ts` only.

## Review API

`POST /api/reservations/:id/center-review` proxies to `set/comment/` (existing contract) and optionally enriches `centers__reviews.private_comment` / `reservation_id` when columns exist.
