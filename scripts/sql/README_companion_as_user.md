# Companions as users (backward-compatible)

## Model

| Concept | Storage |
| --- | --- |
| Primary account | `users` with `parent_user_id IS NULL`, `can_login = 1` |
| Companion | `users` with `parent_user_id = owner.id`, `can_login = 0` |
| Legacy companion id | `users__patient.id` (still used as `patient_id` in APIs) |
| Bridge | `users__patient.linked_user_id → users.id` |
| Booker | `reservations.user_id` |
| Booked-for person | `reservations.for_user_id` (+ legacy `patient_id`) |

## Scripts

- Schema: `scripts/sql/companion_as_user.sql` / `companion_as_user_rollback.sql`
- Data backfill: `node scripts/migrate-companions-to-users.mjs [--apply] [--limit=N]`
- n8n dual-write: `node scripts/patch-n8n-companion-as-user.mjs`
- Unit checks: `node scripts/test-companion-as-user.mjs`

## Compatibility

- `GET /patients` still returns `users__patient` rows (same `id` for clients).
- Response also includes `linked_user_id` / `for_user_id`.
- New `POST add/patients` creates a companion `users` row **and** a `users__patient` bridge row.
- Reservation create still accepts `patient_id`; server also sets `for_user_id`.
- Clients may send `for_user_id` explicitly (NurseRequestFlow / visit booking).

## Display

`resolveReservationDisplayPerson` prefers `for_user` / `for_user_id`, then legacy `patient`.
