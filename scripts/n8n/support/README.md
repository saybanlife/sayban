# Sayban Support — n8n workflows

> **Runtime:** The Next.js app calls `/api/support/*` (same-origin). When
> `SAYBAN_MYSQL_*` env vars are set on the server, those routes query MySQL directly.
> Otherwise they proxy to canonical n8n webhooks under `https://sayban.darkube.ir/webhook/`.

Import these workflows into n8n and attach the existing **MySQL account** credential.

## Auth contract

### User endpoints
- Header: `Authorization: Bearer <user JWT>`
- Code node must decode JWT payload and read `id` / `userId` / `sub` as `user_id`
- Reject if missing
- Always scope queries with `user_id = :authUserId`

### SuperAdmin endpoints
- Header: `Authorization: Bearer <panel JWT>`
- Code node must verify panel user `role === 'super_admin'` (same as other panel routes)
- Reject `center_admin` / `staff`

## Endpoints

Canonical n8n webhook paths (see `src/lib/apiRoutes.ts` → `SUPPORT_WEBHOOK`):

| Method | Webhook path | Role |
| --- | --- | --- |
| GET | `support/conversations/` | user |
| POST | `support/conversations/create` | user |
| GET | `support-user-get-messages/support/conversations/:id/messages` | user (own only) |
| POST | `support-user-get-messages/support/conversations/:id/messages` | user (own only) |
| POST | `user-support-close/support/conversations/:id/close` | user (own only) |
| GET | `panel/support/conversations` | super_admin |
| GET | `panel-support-messages/panel/support/conversations/:id/messages` | super_admin |
| POST | `panel-support-reply/panel/support/conversations/:id/reply` | super_admin |
| POST | `panel-support-status/panel/support/conversations/:id/status` | super_admin |
| POST | `panel-support-close/panel/support/conversations/:id/close` | super_admin |

The frontend calls same-origin `/api/support/*` and `/api/panel/support/*`; those routes
map to the webhook paths above when MySQL is not configured locally.

## Query params (panel list)
- `status`: `open` | `pending` | `answered` | `closed` | `unanswered` (`open` + `pending`)
- `q`: search user name / user id / message text

## Notifications (reuse existing stack)
On **user message**:
1. Update conversation `status='pending'`
2. Optional: call existing FCM sender for SuperAdmin / center_admin devices via `panel__users.fcmToken`
3. Panel UI polls/list refreshes

On **SuperAdmin reply**:
1. Set conversation `status='answered'`
2. `INSERT INTO users__notification (userId, title, text, action, notification_type)` with `notification_type='system'`
3. Send FCM to `users.fcmToken` using the same push path already used by the product (if present in n8n)

Panel staff register tokens with `POST panel/setFcmToken` (Bearer `panelToken`) which updates
`panel__users.fcmToken` / `isnotif` (see `scripts/sql/panel_users_fcm.sql` and
`scripts/add-n8n-panel-set-fcm-token.mjs`). The web client uses the same Firebase stack as home
(`src/lib/fcm.ts`) and chooses the public vs panel upload endpoint from the current route.

## SQL helpers

See `scripts/sql/support_chat.sql` (already applied on `sayban_db`).
