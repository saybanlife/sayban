# Current address selection

The selected address is stored on the address row itself, in
`users__addresses.is_current` (at most one per user).

## SQL (run once on `sayban_db`)

```bash
node .cursor/sayban-ops/pma-sql.js "$(Get-Content scripts/sql/users_addresses_is_current.sql -Raw)"
```

Applied 2026-08-27: adds `is_current` plus a `(user_id, is_current)` index.

## n8n webhooks (`users` workflow)

Created by `scripts/add-n8n-address-current-webhooks.mjs` (`--revert` to undo):

| Method | Path              | Body             | Behaviour                                                        |
| ------ | ----------------- | ---------------- | ---------------------------------------------------------------- |
| GET    | `address/current` | —                | Current address, falling back to the newest one when none is set |
| POST   | `address/current` | `{ address_id }` | Clears the user's rows, marks this one, returns it               |

Both use `jwtAuth`, so the caller must send the user's `Authorization: Bearer`
token; the user id comes from `jwtPayload.id`, never from the request body.

## App routes

- UI chip in the centers page header (visual left): `CurrentAddressChip`
  with `variant="header"`, injected through the `header` override in
  `components/Subcategories.tsx`. It used to float over the home landing.
- Client helper: `components/home/currentAddressApi.ts` → `PUBLIC_ROUTES.addressCurrent`
- `src/pages/api/address/current.ts` is only a same-origin proxy kept for older
  clients; it forwards to the webhook above.

## Centers nearby filter

Filter dialog → «نزدیک‌ترین به آدرس فعلی». `Subcategories` sorts `/centers`
results by haversine distance using the selected address lat/lng.
