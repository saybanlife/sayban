# Panel FCM / notifications

Panel staff (`panel__users`) now register push tokens the same way public users do.

## Database

- `scripts/sql/panel_users_fcm.sql` — adds `fcmToken`, `isnotif` (default 1)
- Rollback: `scripts/sql/panel_users_fcm_rollback.sql`

## n8n (`panel2`)

- `scripts/add-n8n-panel-set-fcm-token.mjs` — `POST panel/setFcmToken`
  - Auth: Bearer panel JWT (`jwtAuth`)
  - Body: `{ token, platform? }`
  - Updates `panel__users.fcmToken` + `isnotif = 1` for `claims.id`
  - Skips UPDATE when auth/FCM payload is invalid (`panel_set_fcm_ok_gate`)
- Gate hardening: `scripts/patch-n8n-panel-set-fcm-gate.mjs`

## App

- `PANEL_ROUTES.setFcmToken` / `PUBLIC_ROUTES.setFcmToken` in `src/lib/apiRoutes.ts`
- `src/lib/fcm.ts` picks audience from route:
  - `/panel/*` (except login/create) + `panelToken` → panel endpoint
  - otherwise + `token` → public `setFcmToken`
- `_app.tsx` shows `NotificationModal` on panel when permission is `default` and staff is logged in
- `PanelNotificationSetup` banner for enable/status when permission is missing/blocked
- Foreground/background display reuses the existing Firebase messaging SW + `onMessage`
