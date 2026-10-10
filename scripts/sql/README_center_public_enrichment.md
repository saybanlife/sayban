# Public center profile enrichment

## Problem

Panel writes relational tables (`centers__daily_schedule`, `centers__activities`,
`centers__care_item_values`, `centers__specialists`, `centers__visit_policy`, …)
via `/panel/*` webhooks. The public UI reads those relational shapes directly
(no keyword heuristics).

## Canonical API

All client Sayban APIs use Base URL:

`https://sayban.darkube.ir/webhook/`

The `sayban2` n8n workflow already performs the full enrichment
(`CenterInfo` + `center_*_public1` nodes + `Code12`), so no BFF merge is needed.
It keys on **`MD5(centers.id)`** — the public center id in URLs is the MD5 hash,
which is also what `GET /centers` returns as `id`.

Two webhooks share that node chain:

| Path | Auth | Used by |
| --- | --- | --- |
| `center/?id=<md5>` | jwtAuth | app/panel callers holding a token |
| `api/center/?id=<md5>` | none | public center page & panel preview (no login) |

`api/center` is listed in `WEBHOOK_API_PATHS` (`src/lib/apiRoutes.ts`) so
`resolveClientApiUrl` sends it to the webhook Base URL instead of the app origin.
Every other `/api/*` path stays a same-origin Next.js BFF route.

Rollback for the added webhook node:

```bash
node scripts/add-n8n-public-center-webhook.mjs --revert
```

`src/pages/api/center/index.ts` is now only a same-origin compatibility shim for
older clients that call `/api/center?id=<numeric>`; the public page no longer
uses it.

## Catalog seed

Empty `activities` / `centers__care_items` libraries mean Panel cannot select
items. Seed from project presets:

`scripts/sql/seed_care_items_and_activities.sql`
