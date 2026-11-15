# AGENTS.md — rules for every contributor (human, Claude, Codex)

## Purpose
GPIP is a neutral, sourced public record of what Ghana's governments promised, funded and
delivered, and how national indicators moved, from 1957 to today. Design spec:
`docs/superpowers/specs/2026-11-09-gpip-government-performance-design.md`. Roadmap and plans:
`docs/superpowers/plans/`.

## Neutrality rules (non-negotiable)
- No scores, grades, rankings, or evaluative words ("success", "failure", "achieved") in code,
  data or copy. UI says "in office during", never "achieved by".
- Missing data is `null`, never `0`; the UI shows "Not available".
- Every factual record has a source (`source_id NOT NULL`) and a reporting period.
- No party colours. Administrations are ordered only by date or name.
- Observed change and causal claims are kept separate.
- AI-extracted content is never published without human review.
- Footer notice text is fixed (see `apps/web/src/components/layout/SiteFooter.tsx`); do not paraphrase it.

## Architecture and package boundaries
- `packages/core` — pure domain rules and Zod schemas. **No I/O.** Highest test coverage.
- `packages/db` — the **only** package that talks to Postgres: Drizzle schema, migrations, seed,
  repositories. Entry points: `@gpip/db` (web-safe: client, schema, read repositories),
  `@gpip/db/node` (migrations, seed, local paths — scripts only), `@gpip/db/testing` (`createTestDb`).
- `packages/ingest` (Plan 2+) — importers and AI extraction; writes through `db` repositories.
- `apps/web` — Next.js App Router. Reads data only through `@gpip/db` repositories, from `server/` folders (see below).
- Never duplicate a type or rule: import it from `core` (or `db` for row types).
- Dates are ISO `YYYY-MM-DD` strings; periods are half-open `[start, end)`.
- Relative imports in packages use explicit `.ts` extensions (`./client.ts`) — works in tsc,
  tsx, Vitest, Turbopack and Node 24.

## apps/web structure
```
apps/web/src/
  app/              routes only: read params, call server queries, render ONE feature view
    (public)/ admin/ api/
  features/<area>/  administrations, commitments, indicators, institutions, sources, changes,
                    overview, corrections, review, documents
    components/     Name.tsx + Name.module.css (+ Name.test.tsx)
    server/         queries.ts, actions.ts, admin-queries.ts, admin-actions.ts ('server-only')
    labels.ts       this feature's display words, one map per concept
    index.ts        the feature's browser-safe public API (never exports server/)
  components/       shared, domain-free UI: layout/ (header, footer, PageHeader…), ui/ (Button…)
  server/           shared server infrastructure: db, auth, editor access, flash, archive store
  lib/              shared pure helpers (format, css-vars)
  styles/           tokens.css (design tokens) and base.css (reset, typography, shared classes)
```
**Where a file goes:** talks to the database, auth, cookies or secrets → a `server/` folder.
Renders UI → `components/` (the feature's, or shared if domain-free). Pure logic → the feature
root, `lib/` if shared, or `packages/core` if it is a domain rule.

**Rules** (enforced by `apps/web/src/architecture.test.ts`):
- Every `server/` file starts with `import 'server-only';`. Only `server/` code imports `@gpip/db`
  or `@gpip/ingest` at runtime (type imports are fine anywhere).
- UI and `lib/` never import server code; pages pass server actions to forms as props.
- Features use each other only through `@/features/<name>` (its `index.ts`); relative imports inside.
- Pages are thin: no `className`, no constant maps, no queries.
- Editor-only code lives in `admin-actions.ts` / `admin-queries.ts`; every exported function there,
  and every page and route under `app/admin/`, checks the editor itself (`requireEditor`).
- Naming: components `PascalCase.tsx` named after their export, styles `PascalCase.module.css`
  beside them; every other file and folder `kebab-case`.
- Styles live in the component's CSS module. Global CSS is only `styles/tokens.css` and
  `styles/base.css` (classes shared by several components). Data-driven values go through
  `cssVars()` as custom properties, not inline style rules.
- E2E tests locate elements by role, label or heading, never by CSS class.

## Code style
- TypeScript strict, `noUncheckedIndexedAccess`; no `any` without a comment saying why.
- Exact dependency versions (no `^`/`~`). TypeScript stays on 5.9.x.
- Biome formats and lints (`pnpm format`). Small, single-responsibility files.
- Conventional commits (`feat(core): …`, `fix(db): …`, `chore: …`, `docs: …`).

## Workflow
1. Pick a GitHub issue. Branch `feat/<issue>-<slug>`.
2. TDD: write the failing test, watch it fail, make it pass, refactor.
3. `pnpm check` (Biome + typecheck + tests) must pass; `pnpm e2e` for web changes.
4. Open a PR with `Closes #N` and the template checklist.
5. Run `codex review --base main` (or ask Claude to review a Codex PR) and address findings.
6. Merge only with green CI.

## Testing
- Vitest everywhere. DB tests use in-memory PGlite (`createTestDb()`), no Docker needed.
- Playwright covers user journeys in `apps/web/e2e`.
- Test real behaviour; mocks only at true external boundaries (HTTP APIs).

## Commands
| Command | What it does |
|---|---|
| `pnpm i` | install |
| `pnpm check` | Biome CI + typecheck + unit/integration tests |
| `pnpm build` | build all packages and the site |
| `pnpm e2e` | Playwright end-to-end tests |
| `pnpm db:migrate` / `pnpm db:seed` | apply migrations / load seed data (local PGlite by default) |
| `pnpm dev` | run the site locally |
| `pnpm --filter @gpip/web e2e:visual` | local-only screenshot comparison (record with `--update-snapshots` first; not in CI) |

## Data sourcing
- Prefer official Ghanaian sources (GSS, BoG, MoF, Presidency, Parliament, Electoral Commission),
  then international organisations (World Bank, IMF, AfDB, UN agencies), then reputable reference
  works. Record URL and retrieval date for every source.

## CI security
- Pin every GitHub Action to a full commit SHA with the version as a comment; never a bare tag.
- Workflows default to `permissions: contents: read`; grant more per job only when needed.
