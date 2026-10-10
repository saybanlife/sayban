# Sayban repository instructions

These instructions apply to every task in this repository.

## Agent replies (token budget)

Follow `.cursor/rules/token-optimization.mdc` on every turn: no filler; patches/hunks only; ask instead of speculating; never paste unchanged full files.

## Product and design

- Preserve the existing Persian-first, RTL, mobile-first product language.
- Follow the existing design system before creating anything new. Reuse current Plasmic components, developer-owned wrappers, CSS variables/tokens, Vazirmatn typography, spacing, buttons, inputs, dialogs, loading states, and responsive patterns.
- Prefer existing component copy and terminology. Add new Persian copy only when the product needs wording that does not already exist.
- Keep interfaces modern, simple, accessible, and user-friendly. Do not introduce a visually unrelated component or styling system.
- Treat generated files under `components/plasmic/` as generated code. Prefer developer-owned wrappers and code components unless a task explicitly requires a Plasmic sync/generated change.

## Architecture and implementation

- Before changing a feature, trace its route, wrapper/component tree, state flow, API calls, shared helpers, and related n8n/database behavior.
- Preserve the existing Next.js Pages Router + Plasmic architecture and established shared patterns.
- Keep changes narrowly scoped, maintainable, performant, and backward compatible unless the task explicitly requires a breaking change.
- Check security boundaries for every backend or data-flow change: authentication, authorization/ownership, input validation, output exposure, injection, XSS/CSRF/SSRF, rate/size limits, secrets, error leakage, and abuse paths as relevant.
- Never expose server credentials or secrets to client bundles, logs, committed files, generated artifacts, or user-visible errors.

## Change management and rollback

- Inspect `git status` before editing and preserve unrelated user changes.
- Make every change reviewable and reversible. For database or n8n changes, create or preserve a backup/snapshot and an explicit rollback path before applying the mutation.
- Database migrations must be idempotent where practical and include a paired rollback SQL file or documented safe rollback procedure.
- n8n workflow edits must preserve a pre-change export under the repository's ignored backup location and be verified after activation.
- Do not mutate production database or n8n state merely to inspect it. Use read-only checks until the requested task requires a write.
- Do not deploy, publish, activate workflows, or apply production data changes unless the user's task clearly requests that operational change.

## Verification

- Add or update tests for every behavior change.
- After each coherent implementation change, run the most focused relevant tests first, diagnose failures to their root cause, and fix regressions.
- Before handing off, run the broadest feasible verification for the affected surface: TypeScript checking, lint, targeted test scripts, build, and relevant UI/API smoke checks.
- Do not claim the whole application is safe or working without evidence. Report what was run, what passed, and any unverified risk.
- Review performance-sensitive paths for unnecessary requests, rerenders, large client payloads, unbounded queries, missing pagination, and cache misuse.

## Local access configuration

- Operational credentials belong only in ignored local environment files such as `.env.local`; never copy their values into this file, docs, source code, commits, screenshots, or responses.
- Existing local variable conventions include `N8N_URL`, `N8N_USER`, `N8N_PASSWORD`, and `SAYBAN_MYSQL_*`.
- Treat production access as sensitive. Redact credentials from command output and rotate them if they are ever committed or otherwise exposed.

## Project context

- Read `docs/project-overview.md` for the maintained architecture map before substantial changes, and update it when routes, shared flows, API architecture, or design-system conventions materially change.
