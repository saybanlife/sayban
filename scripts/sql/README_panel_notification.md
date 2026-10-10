# Panel staff inbox (`panel__notification`)

Mirrors public `users__notification` for panel JWT users.

## Schema

- `scripts/sql/panel_notification.sql`
- Rollback: `scripts/sql/panel_notification_rollback.sql`

## n8n (`panel2`)

Install: `node scripts/add-n8n-panel-notifications.mjs`

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| GET | `panel/notifications` | Bearer panel JWT | Rows for `claims.id` **or** `panel_user_id = 0` |
| POST | `panel/notifications/seen` | Bearer | `{ id }` |
| POST | `panel/notifications/add` | Bearer (super_admin) | `{ title, text, action?, notification_type?, panel_user_id? }` — `panel_user_id` default `0` (broadcast) |

## App

- List UI: `/panel/notifications` → `MainPageNotifications`
- TopPage bell → `/panel/notifications`
- Send form (`MainPageSendNotif`):
  - app users → webhook `send-notif` (`PANEL_ROUTES.sendNotif`)
  - panel staff → webhook `send-notif-panel` (`PANEL_ROUTES.sendNotifPanel`)
  - Both resolve against `API_BASE_URL` (n8n), not the Next.js app origin.
