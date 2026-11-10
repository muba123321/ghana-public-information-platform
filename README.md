# Ghana Public Information Platform (GPIP)

A neutral, sourced public record of what Ghana's governments promised, funded and delivered —
and how the country's economic and social indicators moved — from independence in 1957 to today.

All information is compiled from publicly available sources published by Ghanaian public
institutions, political parties and international organisations. Every figure links to its
original source. GPIP is independent and is not affiliated with the Government of Ghana or any
political party.

## Status
Plan 1 (Foundation) in progress. See `docs/superpowers/plans/2026-11-09-roadmap.md`.

## Quickstart
Requires Node 24 and pnpm 11.

```bash
pnpm i
pnpm db:migrate
pnpm db:seed
pnpm dev        # http://localhost:3000/history
```

`pnpm check` runs lint, typecheck and tests. Contributor rules: [AGENTS.md](AGENTS.md).

## Licence
Code: MIT. Data: each dataset keeps its publisher's licence, stated on its source record.
