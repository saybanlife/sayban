# Reminders (لیاد) — Sayban DB + n8n

Greenfield reminder system on `sayban_db` and Sayban n8n (`API_BASE_URL`).
No migration from legacy `n8n.staas.ir`.

## Locked product rules

| Rule | Value |
| --- | --- |
| Timezone | `Asia/Tehran` wall-clock in all DATETIME columns |
| Materialize horizon | 30 days ahead for `active` reminders |
| Channels | `notification` (free), `sms` (500 تومان), `bale` (200 تومان) |
| Insufficient balance | skip that channel only; other channels still send |
| Wallet | checked/debited immediately before each paid send |

## Schema

- Apply: `node scripts/apply-reminders-sql.mjs`
- SQL: `scripts/sql/reminders.sql`
- Rollback: `node scripts/apply-reminders-sql.mjs --rollback` → `scripts/sql/reminders_rollback.sql`

### Tables

| Table | Role |
| --- | --- |
| `reminders` | Reminder definitions |
| `reminder_occurrences` | Scheduled fire slots (main + pre) |
| `reminder_deliveries` | Per-channel send attempts + cost snapshot |
| `reminder_wallets` | Per-user Liad balance (toman) |
| `reminder_wallet_transactions` | Append-only ledger |
| `reminder_channel_prices` | Channel unit prices |
| `reminder_categories` | Catalog categories |
| `reminder_templates` | Occasions / suggestions |

## n8n

Install / update:

```bash
node scripts/add-n8n-reminders.mjs
```

Revert (deactivate + delete workflow nodes backup kept under `scripts/backup/`):

```bash
node scripts/add-n8n-reminders.mjs --revert
```

Workflow name: `reminders`

### Public / user webhooks (Bearer user JWT)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `reminders` | List own reminders |
| GET | `user/task/list` | Alias for UI |
| POST | `reminders` | Create + materialize 30d |
| POST | `user/task/add` | Alias |
| POST | `reminders/edit` | Edit + bump version + replan |
| POST | `user/task/edit` | Alias |
| POST | `reminders/pause` | `{ id }` |
| POST | `reminders/resume` | `{ id }` |
| POST | `reminders/cancel` | `{ id }` |
| POST | `reminders/delete` | soft delete `{ id }` |
| GET | `reminders/categories` | Catalog |
| GET | `reminders/occasions` | Templates kind=occasion |
| GET | `reminders/suggestions` | Templates kind=suggestion |
| GET | `wallet` | `{ balance }` (ensures wallet row) |
| GET | `wallet/transactions` | Recent ledger |
| POST | `wallet/topup` | `{ amount }` → pending `payments` row `type=liad_wallet` |
| POST | `wallet/topup/confirm` | `{ payment_id }` credits wallet when payment succeeded |

### Workers (Cron inside workflow)

| Job | Interval | Role |
| --- | --- | --- |
| materialize | every 6h | Keep 30-day occurrence window full |
| dispatch | every 1m | Claim due occurrences, debit wallet, send channels |
| retry | every 1m | Retry `retry_wait` deliveries |
| expire | hourly | Mark finished reminders `completed` |

## App routes

Canonical paths are registered in `src/lib/apiRoutes.ts` → `PUBLIC_ROUTES`.
Client resolution (`src/lib/resolveClientApiUrl.ts`) maps relative paths and
legacy `n8n.staas.ir/webhook/...` reminder/wallet URLs onto `API_BASE_URL`.

Plasmic Liad UI now uses relative paths (`user/task/*`, `reminders/*`, `wallet`).

## Verification

```bash
node scripts/apply-reminders-sql.mjs
node scripts/add-n8n-reminders.mjs
node scripts/patch-n8n-reminders-mariadb-json.mjs
node scripts/patch-n8n-reminders-inline-sql.mjs
node scripts/patch-n8n-reminders-list-shape.mjs
node scripts/patch-n8n-reminders-catalog-shape.mjs
node scripts/e2e-reminders.mjs
```

E2E covers OTP JWT → `wallet` → `user/task/add` → `user/task/list` → DB materialize (30d slots) → forced due dispatch → `reminders/cancel`.

| Channel | Behavior |
| --- | --- |
| `notification` | Insert `users__notification` (`notification_type=reminder`); push via existing FCM token when present |
| `sms` | HTTP to Liom SMS template service (same stack as `users/sms`); failure → retry/refund rules |
| `bale` | HTTP placeholder node (configure Bale bot URL in workflow); missing config → `skipped` `PROVIDER_NOT_CONFIGURED` without charge |

Paid channels: charge with idempotency key `delivery:{id}:attempt:{n}` before provider call; refund on hard provider failure after debit.
