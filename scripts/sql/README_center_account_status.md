# Center account status switch (`mainPageCenter`)

Toggles the panel login of a center, i.e. the `panel__users` row where
`center_id` matches and `role = 'center_admin'`.

## n8n changes (`panel2` workflow)

Both scripts accept `--revert` and write a workflow backup to `scripts/backup/`
before patching.

1. `scripts/patch-n8n-panel-centers-account.mjs` — extends the `panel/centers`
   query so every row also carries `account_id` and `account_is_active`. The
   account is resolved with a scalar subquery, so centers with more than one
   admin cannot duplicate rows.
2. `scripts/add-n8n-center-account-status-webhook.mjs` — adds
   `POST panel/center/account-status` with body `{ center_id, is_active }`. It
   updates the admin row and responds with the stored value:

   ```json
   { "success": true, "result": { "id": 114, "center_id": 144, "is_active": 0 } }
   ```

   `result` is `null` when the center has no `center_admin` account.

Keying by `center_id` (instead of the existing `panel/users/is_active`, which
needs a `panel__users.id`) lets the table toggle an account using only the id it
already renders as each row's key.

## App wiring

- Route constant: `PANEL_ROUTES.centerAccountStatus` in `src/lib/apiRoutes.ts`
- Client helper: `components/centerPanel/centerAccountStatus.ts`
- Column: hand-added `account_is_active` field in
  `components/plasmic/sayban/PlasmicMainPageCenter.tsx` («وضعیت حساب»), rendered
  by RichTable as an antd switch, plus `rowKey: "id"` so each `tr` exposes the
  center id.
- Toggle: `components/MainPageCenter.tsx` captures clicks on `.ant-switch`
  before they reach the row-click navigation, calls the webhook, and repaints
  the switch from the response.

RichTable renders `fields` as display-only values, so the click handler lives in
the hand-owned wrapper rather than in the column config.

## Known gap

`panel/center/account-status` is unauthenticated, matching its siblings
(`/panel/centers`, `/panel/users/is_active`, …). Adding auth to this endpoint
should be done together with the rest of the panel webhooks.
