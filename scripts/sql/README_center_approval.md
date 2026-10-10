# Center registration review & approval

Super Admin can open a center's registration dossier from the centers list
and approve or reject the signup.

## App

- List action «مشاهده اطلاعات» → `/panel/center_info-{id}`
- Page: `components/centerPanel/CenterRegistrationReview.tsx`
- Client API: `components/centerPanel/centerApproval.ts`
- Routes: `PANEL_ROUTES.centerRegistration`, `PANEL_ROUTES.centerApproval`

Approving sets:

- `centers.approval_status = 'approved'`
- `centers.is_active = 1`
- `panel__users.is_active = 1` for `role = 'center_admin'`

Rejecting sets both `is_active` flags to `0` and `approval_status = 'rejected'`.

## n8n (`panel2`)

```bash
node scripts/add-n8n-center-approval-webhooks.mjs
node scripts/patch-n8n-panel-centers-approval-status.mjs
```

Both write a backup under `scripts/backup/` and accept `--revert`.

## Register → login UI fix

`LoginPanel` unmounts `CreateAccont` when the route is not `/panel/create`, so
step-2 («اطلاعات مرکز») cannot leak onto `/panel/login` after soft navigation.
