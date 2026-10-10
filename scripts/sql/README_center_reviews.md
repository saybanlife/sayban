# Panel: Center reviews (CenterAdmin)

## Access
- Menu: **نظرات مرکز** → `/panel/reviews`
- Permission: `center_admin` only (`role` in JWT / `panel__users.role`)

## API (n8n webhooks)
Base: `API_BASE_URL` (`https://sayban.darkube.ir/webhook/`), workflow `panel2`.

| Method | Path | Body |
| --- | --- | --- |
| GET | `panel/reviews?q=&replied=all\|yes\|no` | — |
| POST | `panel/reviews/reply` | `{ "review_id": 1, "comment": "..." }` |
| POST | `panel/reviews/clear-reply` | `{ "review_id": 1 }` |
| POST | `panel/reviews/delete` | `{ "review_id": 1 }` |

Auth: `Authorization: Bearer <panel token>` (webhook `jwtAuth`).
Allowed roles: `center_admin` (own centre only) and `super_admin` (any centre).

**For center_admin**, the centre is never taken from the request. Every statement joins
`panel__users` on the id inside the verified JWT and requires
`role = 'center_admin'`, so a caller can only reach their own center's rows.
**For super_admin**, delete is allowed for any `review_id`.
An unauthorized or unknown review yields `{ success: false, message: "نظر یافت نشد." }`.

Added by `scripts/add-n8n-panel-reviews-webhooks.mjs` (supports `--revert`).
Delete endpoint: `scripts/patch-n8n-panel-reviews-delete.mjs` (supports `--revert`).

## Delete review
`POST panel/reviews/delete` removes the reply (if any) then the review row,
scoped to the caller's centre via JWT (or any centre for `super_admin`).

On the panel **center page**, Super Admin sees «حذف نظر» under each comment
(`Comments` + `canDeleteReviews`). The `/panel/center` payload aliases the PK as
`review_id` (not `id`); the UI resolves either field via `resolveCenterReviewId`.

The dedicated reviews inbox (`MainPageReviews`) asks for `window.confirm` before
calling and reloads the list on success.

## DB
Replies live in **`centers__reply`** (`center_id`, `user_id`, `review_id`,
`comment`, `created_at`) — the same table the public center page reads.
A reply is upserted by deleting any existing row for the review, then inserting.

> The legacy `centers__reviews.admin_reply` / `admin_replied_at` /
> `admin_replied_by` columns (migration `centers_reviews_admin_reply.sql`) are
> **no longer written**. Nothing reads them; they are kept only so existing rows
> are not lost.

## Public display
`Comment.tsx` renders «پاسخ مرکز» from `admin_reply` on a review. The public
`reviews` query in workflow `sayban2` joins `centers__reply` and exposes it as
`admin_reply` / `admin_replied_at` (`scripts/patch-n8n-public-reviews-reply.mjs`,
supports `--revert`).

## Why not a Next.js API route
This used to be `/api/panel/reviews`, backed by `src/lib/server/reviewsService.ts`
and a direct MySQL pool. It returned
`503 Reviews DB is not configured. Set SAYBAN_MYSQL_* env vars` on **every** call,
because those vars are unset — and setting them would not help, since direct
MySQL TCP to `sayban_db` is denied for public client IPs (see the
`sayban-db-access` rule). It also wrote replies to columns nothing else read.

**Do not reintroduce a direct-MySQL BFF route for this data.** Panel review
traffic belongs on the canonical webhook base, like the rest of the panel.
