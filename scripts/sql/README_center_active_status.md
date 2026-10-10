# Center active status switch (`mainPageCenter`)

Toggles `centers.is_active` (public/listing active flag), independent of the
panel login toggle (`panel__users.is_active` / «فعال بودن حساب کاربری»).

## n8n (`panel2`)

1. `scripts/add-n8n-center-active-status-webhook.mjs` — `POST panel/center/active-status`
   with `{ center_id, is_active }` → updates `centers.is_active` and returns
   `{ success, result: { id, is_active } }`.
2. `scripts/patch-n8n-panel-centers-is-active-column.mjs` — adds
   `c.is_active AS is_active` to `GET /panel/centers`.

Both scripts write a backup under `scripts/backup/` and accept `--revert`.

## App

- `PANEL_ROUTES.centerActiveStatus` in `src/lib/apiRoutes.ts`
- `components/centerPanel/centerActiveStatus.ts`
- Columns in `PlasmicMainPageCenter.tsx`: «فعال بودن حساب کاربری» + «فعال بودن مرکز»
- Click handling in `components/MainPageCenter.tsx` (distinguishes switches by header text)
- The separate «وضعیت تأیید» column is no longer injected; approval still happens on
  `/panel/center_info-{id}`.
