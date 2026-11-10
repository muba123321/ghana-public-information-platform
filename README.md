# Ghana Public Information Platform (GPIP)

A neutral, sourced public record of what Ghana's governments promised, funded and delivered —
and how the country's economic and social indicators moved — from independence in 1957 to today.

All information is compiled from publicly available sources published by Ghanaian public
institutions, political parties and international organisations. Every figure links to its
original source. GPIP is independent and is not affiliated with the Government of Ghana or any
political party.

## Status
Plans 1 (Foundation) and 2 (Indicators) built; see the roadmap. See `docs/superpowers/plans/2026-11-09-roadmap.md`.

## Quickstart
Requires Node 24 and pnpm 11.

```bash
pnpm i
pnpm db:seed    # applies migrations and loads reference data
pnpm ingest     # imports indicators from the World Bank and IMF (~20 s); add --fixtures to work offline
pnpm dev        # http://localhost:3000
```

**After pulling new changes**, stop `pnpm dev` and run `pnpm db:seed` (and `pnpm ingest` if indicators
changed) before starting it again. The local database (PGlite) can only be opened by one process
at a time, and the dev server does not apply migrations itself.

`pnpm check` runs lint, typecheck and tests. Contributor rules: [AGENTS.md](AGENTS.md).

## Licence
Code: MIT. Data: each dataset keeps its publisher's licence, stated on its source record.
