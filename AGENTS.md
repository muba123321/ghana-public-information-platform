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
- Footer notice text is fixed (see `apps/web/components/SiteFooter.tsx`); do not paraphrase it.

## Architecture and package boundaries
- `packages/core` — pure domain rules and Zod schemas. **No I/O.** Highest test coverage.
- `packages/db` — the **only** package that talks to Postgres: Drizzle schema, migrations, seed,
  repositories.
- `packages/ingest` (Plan 2+) — importers and AI extraction; writes through `db` repositories.
- `apps/web` — Next.js App Router. Reads data only through `@gpip/db` repositories.
- Never duplicate a type or rule: import it from `core` (or `db` for row types).
- Dates are ISO `YYYY-MM-DD` strings; periods are half-open `[start, end)`.

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

## Data sourcing
- Prefer official Ghanaian sources (GSS, BoG, MoF, Presidency, Parliament, Electoral Commission),
  then international organisations (World Bank, IMF, AfDB, UN agencies), then reputable reference
  works. Record URL and retrieval date for every source.
