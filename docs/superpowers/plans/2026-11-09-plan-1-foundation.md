# Plan 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public TypeScript monorepo with CI, the core time/attribution rules, the Postgres
schema for Ghana's political and institutional history, a verified seed of every administration
since 1957, and a public site showing the administration directory and profiles with the
public-data notice.

**Architecture:** pnpm + Turborepo monorepo. `packages/core` holds pure, I/O-free domain rules and
Zod schemas. `packages/db` is the only package that touches Postgres (Drizzle schema, migrations,
seed, repository queries); it runs on PGlite locally and in tests (no Docker) and on Neon in
production via `postgres`. `apps/web` is a Next.js App Router site that reads only through
`packages/db` repositories.

**Tech Stack:** Node 24, pnpm 11, TypeScript 5.9.3 (strict), Turborepo 2.11, Next.js 16 /
React 19, Drizzle ORM 0.45 + drizzle-kit 0.31, PGlite 0.5, postgres 4.1, Zod 4, Vitest 5,
Playwright 1.65, Biome 2.6.

**Spec:** `docs/superpowers/specs/2026-11-09-gpip-government-performance-design.md`
**Roadmap:** `docs/superpowers/plans/2026-11-09-roadmap.md`

## Global Constraints

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`; no `any` without a comment saying why.
- Pin exact dependency versions (no `^`/`~`); TypeScript stays on 5.9.x (Next.js tooling).
- Dates are ISO `YYYY-MM-DD` strings in the domain; periods are **half-open** `[start, end)`.
- Missing data is `null`, never `0`; UI shows "Not available".
- No scores, grades, rankings or evaluative words anywhere in code, data or copy.
- No party colours; administrations are never sorted by anything but date or name.
- Every administration and institution version row has a NOT NULL `source_id`.
- Footer notice text (verbatim, every page): *"All information on this platform is compiled from
  publicly available sources published by Ghanaian public institutions, political parties and
  international organisations. Every figure links to its original source. GPIP is independent
  and is not affiliated with the Government of Ghana or any political party."*
- UI copy says "in office during", never "achieved by".
- Code licence MIT. Conventional commits. One PR per task, linked to its GitHub issue
  (`Closes #N`); every PR gets `codex review --base main` before merge.

## Review Focus

1. **Incumbent administration (`end = null`)** — attribution, ordering and display treat it as
   ongoing up to `today`, never as zero-length or as an error. → tests in Task 2 and Task 5.
2. **A period containing three or more governments (1979: SMC II, AFRC, PNP)** — plurality holder
   is primary, period is flagged `transition`, ties resolve to the earlier tenure. → Task 2.
3. **Inherited baseline where the immediately prior period has no value** — return that period
   with `value: null` ("not available"); never silently fall back to an older year. → Task 2.
4. **Periods before 6 March 1957 or in the future** — no association, no throw. → Task 2.
5. **Re-running the seed / bad seed data** — seeding twice yields no duplicates; overlapping
   administration tenures are rejected by the database. → Task 4.

## File Structure

```
.
├── AGENTS.md                      # single source of coding rules (Claude + Codex)
├── CLAUDE.md                      # "Read AGENTS.md" pointer
├── README.md  LICENSE  .gitignore  .nvmrc  biome.json
├── package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json  vitest.workspace.ts
├── .github/workflows/ci.yml
├── .github/pull_request_template.md
├── packages/core/src/
│   ├── period.ts            # Period type, parsing, overlap maths
│   ├── tenure.ts            # Tenure type
│   ├── attribution.ts       # associate()
│   ├── baseline.ts          # inheritedBaseline()
│   ├── schemas.ts           # Zod schemas for seed/domain records
│   └── index.ts
├── packages/db/
│   ├── drizzle.config.ts
│   ├── migrations/          # generated + one custom (exclusion constraints)
│   ├── src/schema/{enums,editorial,political,sources,institutions,changelog,index}.ts
│   ├── src/client.ts        # createDb()
│   ├── src/testing.ts       # createTestDb()
│   ├── src/repositories/{administrations,institutions}.ts
│   ├── src/seed/{data/*.ts,seed.ts,cli.ts}
│   └── src/index.ts
└── apps/web/
    ├── app/{layout,page}.tsx
    ├── app/history/{page.tsx,administrations/page.tsx,administrations/[slug]/page.tsx}
    ├── app/data-notice/page.tsx
    ├── components/{SiteFooter,AdministrationTimeline,NotAvailable}.tsx
    ├── lib/db.ts
    └── e2e/history.spec.ts
```

---

### Task 1: Monorepo, tooling, conventions and CI

**Files:**
- Create: everything at the repo root listed above, `.github/*`, empty `packages/core`,
  `packages/db`, `apps/web` package.json files, `packages/core/src/index.ts`,
  `packages/core/src/smoke.test.ts`

**Interfaces:**
- Produces: root scripts `pnpm check` (= `biome ci . && turbo run typecheck test`),
  `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm e2e`; workspace package names
  `@gpip/core`, `@gpip/db`, `@gpip/web`; `tsconfig.base.json` every package extends.

- [ ] **Step 1:** `git init -b main` already done by setup; create `pnpm-workspace.yaml`
  (`apps/*`, `packages/*`), root `package.json` (`"packageManager": "pnpm@11.23.0"`,
  `"engines": {"node": ">=24"}`, `"type": "module"`), `.nvmrc` = `24`, `turbo.json` with tasks
  `build` (dependsOn `^build`, outputs `.next/**`, `dist/**`), `typecheck`, `test`, `e2e`
  (cache false).
- [ ] **Step 2:** `tsconfig.base.json`: target ES2023, module/moduleResolution `NodeNext`
  (web overrides to `Bundler`), strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`. `biome.json`: recommended rules, 2-space, single quotes, line width 100.
- [ ] **Step 3:** Write `packages/core/src/smoke.test.ts` asserting `import('./index.js')`
  resolves; `vitest.workspace.ts` lists `packages/*`.
- [ ] **Step 4:** Run `pnpm install && pnpm check` → Expected: biome clean, typecheck clean,
  1 test passing.
- [ ] **Step 5:** `AGENTS.md` — sections: Purpose (2 lines + link to spec), Neutrality rules
  (copy Global Constraints), Architecture & package boundaries (`core` no I/O; only `db` touches
  SQL; `web` reads via `db` repositories only; never duplicate a type — import from `core`),
  Workflow (issue → branch `feat/<issue>-<slug>` → TDD → `pnpm check` → PR with `Closes #N` →
  `codex review --base main` → address findings → merge), Testing rules (TDD; PGlite for DB;
  Playwright for journeys), Commands. `CLAUDE.md` contains only: `Read and follow AGENTS.md.`
- [ ] **Step 6:** `README.md` (what/why, quickstart: `pnpm i`, `pnpm db:migrate`,
  `pnpm db:seed`, `pnpm dev`), `LICENSE` (MIT, "GPIP contributors"), `.gitignore`
  (node_modules, .next, dist, .data, .env*, coverage, playwright-report).
- [ ] **Step 7:** `.github/workflows/ci.yml`: on PR + push to main; ubuntu-latest; checkout,
  `pnpm/action-setup`, `actions/setup-node` (node 24, pnpm cache), `pnpm install --frozen-lockfile`,
  `pnpm check`, `pnpm build`, `pnpm exec playwright install --with-deps chromium`, `pnpm e2e`.
  `pull_request_template.md`: Summary, `Closes #`, checklist (tests added, `pnpm check` passes,
  neutrality rules respected, sources cited for any data, Codex review addressed).
- [ ] **Step 8: Commit** `chore: scaffold monorepo, tooling, conventions and CI`

---

### Task 2: Core time and attribution rules (`@gpip/core`)

**Files:**
- Create: `packages/core/src/{period,tenure,attribution,baseline}.ts`, tests beside each
  (`*.test.ts`); export all from `index.ts`; delete `smoke.test.ts`.

**Interfaces:**
- Produces:
  ```ts
  type IsoDate = string                                   // 'YYYY-MM-DD'
  interface Period { start: IsoDate; end: IsoDate }       // half-open [start, end)
  function parseIsoDate(s: string): IsoDate               // throws RangeError on invalid/impossible date
  function periodDays(p: Period): number
  function overlapDays(a: Period, b: Period): number      // 0 if disjoint
  function annualPeriod(year: number): Period             // [Y-01-01, (Y+1)-01-01)
  interface Tenure { slug: string; start: IsoDate; end: IsoDate | null }   // null = incumbent
  function tenurePeriod(t: Tenure, today: IsoDate): Period                 // end ?? today
  interface Association {
    primary: string | null            // tenure slug with most days in period
    transition: boolean               // true when >1 tenure overlaps the period
    shares: { slug: string; days: number }[]   // ordered by tenure start
  }
  function associate(period: Period, tenures: readonly Tenure[], today: IsoDate): Association
  interface PeriodValue { period: Period; value: number | null }
  function inheritedBaseline(t: Tenure, series: readonly PeriodValue[]): PeriodValue | null
  ```

- [ ] **Step 1: Write failing tests** (`period.test.ts`, `attribution.test.ts`, `baseline.test.ts`):
  ```ts
  // period
  expect(periodDays({ start: '2024-01-01', end: '2025-01-01' })).toBe(366)
  expect(overlapDays(annualPeriod(2017), { start: '2017-01-07', end: '2021-01-07' })).toBe(359)
  expect(overlapDays(annualPeriod(2016), { start: '2017-01-07', end: '2021-01-07' })).toBe(0)
  expect(() => parseIsoDate('2023-02-30')).toThrow(RangeError)

  // attribution — fixtures use real tenures
  const t = [
    { slug: '1978-smc-ii', start: '1978-07-05', end: '1979-06-04' },
    { slug: '1979-afrc', start: '1979-06-04', end: '1979-09-24' },
    { slug: '1979-third-republic', start: '1979-09-24', end: '1981-12-31' },
    { slug: '2021-akufo-addo-ii', start: '2021-01-07', end: '2025-01-07' },
    { slug: '2025-mahama-ii', start: '2025-01-07', end: null },
  ]
  it('assigns a handover year to the majority holder and flags it', () => {
    const a = associate(annualPeriod(2025), t, '2026-11-09')
    expect(a).toMatchObject({ primary: '2025-mahama-ii', transition: true })
    expect(a.shares.map(s => s.days)).toEqual([6, 359])
  })
  it('uses plurality when three governments share a year (1979)', () => {
    const a = associate(annualPeriod(1979), t, '2026-11-09')
    expect(a.primary).toBe('1978-smc-ii')            // 154 days vs 112 vs 99
    expect(a.transition).toBe(true)
    expect(a.shares).toHaveLength(3)
  })
  it('treats the incumbent as ongoing to today', () => {
    expect(associate(annualPeriod(2026), t, '2026-11-09'))
      .toEqual({ primary: '2025-mahama-ii', transition: false, shares: [{ slug: '2025-mahama-ii', days: 312 }] })
  })
  it('returns no association before 1957 or in the future', () => {
    expect(associate(annualPeriod(1950), t, '2026-11-09')).toEqual({ primary: null, transition: false, shares: [] })
    expect(associate(annualPeriod(2030), t, '2026-11-09').primary).toBeNull()
  })
  it('breaks exact ties toward the earlier tenure', () => { /* two synthetic tenures splitting a 10-day period 5/5 → earlier slug */ })

  // baseline
  const term = { slug: '2017-akufo-addo-i', start: '2017-01-07', end: '2021-01-07' }
  it('is the last complete period ending on/before the start', () => {
    const s = [2014, 2015, 2016, 2017].map(y => ({ period: annualPeriod(y), value: y }))
    expect(inheritedBaseline({ ...term, start: '2017-01-01' }, s)?.value).toBe(2016)
    expect(inheritedBaseline(term, s)?.value).toBe(2016)   // 2017 is not complete before 7 Jan
  })
  it('returns the prior period with null value rather than skipping back', () => {
    const s = [{ period: annualPeriod(2015), value: 5 }, { period: annualPeriod(2016), value: null }]
    expect(inheritedBaseline(term, s)).toEqual({ period: annualPeriod(2016), value: null })
  })
  it('returns null when the series starts after the tenure', () => {
    expect(inheritedBaseline(term, [{ period: annualPeriod(2018), value: 1 }])).toBeNull()
  })
  ```
- [ ] **Step 2:** `pnpm --filter @gpip/core test` → Expected: FAIL (modules not found).
- [ ] **Step 3:** Implement. Day arithmetic via UTC epoch (`Date.UTC`) to avoid timezone drift;
  clip tenure periods to the observation period; ignore zero-day overlaps; `inheritedBaseline`
  picks the series item with the greatest `period.end` such that `period.end <= t.start`
  (unsorted input allowed).
- [ ] **Step 4:** `pnpm --filter @gpip/core test` → Expected: all PASS.
- [ ] **Step 5: Commit** `feat(core): period maths, administration attribution and inherited baseline`

---

### Task 3: Database schema, migrations and test harness (`@gpip/db`)

**Files:**
- Create: `packages/db/src/schema/*.ts`, `src/client.ts`, `src/testing.ts`, `drizzle.config.ts`,
  `migrations/*` (generated) + `migrations/<n>_constraints.sql` (custom),
  `src/schema/schema.test.ts`

**Interfaces:**
- Consumes: nothing from `core` at runtime (types only, if any).
- Produces:
  ```ts
  type Db = PgliteDatabase<typeof schema> | PostgresJsDatabase<typeof schema>
  function createDb(url?: string): Promise<Db>   // undefined or 'pglite:<dir>' → PGlite file DB (default '.data/pglite'); otherwise postgres-js
  function migrateDb(db: Db): Promise<void>
  function createTestDb(): Promise<Db>           // in-memory PGlite with btree_gist, migrated
  ```
  Tables (snake_case in SQL, camelCase in TS):
  - `enums.ts`: `review_status` (draft|in_review|published|rejected), `provenance`
    (api|table_import|ai_extracted|manual), `administration_kind` (civilian|military|transitional),
    `leader_role` (head_of_state|head_of_government|vice_president),
    `source_type` (official_website|statute|gazette|report|dataset|manifesto|budget_statement|development_plan|reference_work),
    `lineage_kind` (renamed|merged_into|split_from|replaced_by|absorbed_functions_of).
  - `editorial.ts`: `editorialColumns` = reviewStatus (default `draft`), provenance, reviewedBy
    (text null), reviewedAt (timestamptz null), createdAt, updatedAt — spread into every editorial table.
  - `sources.ts`: `sources` (id uuid pk, publisher, title, url, sourceType, publishedOn date null,
    retrievedOn date not null, licence text null, archiveKey text null, sha256 text null,
    unique(url, title)).
  - `political.ts`: `parties` (slug pk, name, abbreviation), `persons` (slug pk, fullName),
    `administrations` (slug pk, name, kind, partySlug fk null, startDate, endDate null,
    sourceId fk **not null**, notes text null, …editorialColumns),
    `administration_leaders` (id pk, administrationSlug fk, personSlug fk, role, startDate,
    endDate null, label text null — e.g. "Chairman, Presidential Commission", sourceId fk not null).
  - `institutions.ts`: `sectors` (slug pk, name), `institutions` (slug pk, kind text),
    `institution_versions` (id pk, institutionSlug fk, name, mandate null, parentSlug fk null,
    sectorSlug fk null, validFrom, validTo null, sourceId not null, …editorialColumns),
    `institution_lineage` (id pk, fromSlug, toSlug, kind, effectiveOn, sourceId not null).
  - `changelog.ts`: `change_log` (id bigserial, entityTable, entityKey, action, before jsonb null,
    after jsonb null, changedBy, changedAt default now()). Append-only (no update/delete in repos).
  - Custom migration: `create extension if not exists btree_gist`; exclusion constraint
    `administrations_no_overlap` on `daterange(start_date, coalesce(end_date,'infinity'),'[)') with &&`;
    same for `institution_versions` per `institution_slug`; check constraints
    `end_date is null or end_date > start_date` on administrations, leaders, versions.

- [ ] **Step 1: Write failing tests** (`schema.test.ts`, each on a fresh `createTestDb()`):
  `rejects an administration without a source` (insert with sourceId null → rejects);
  `rejects overlapping administrations` (1993-01-07→1997-01-07 then 1996-01-01→2001-01-07 → rejects
  with constraint `administrations_no_overlap`); `allows back-to-back tenures sharing a boundary date`;
  `allows only one open-ended administration to overlap nothing` (two `endDate: null` rows → rejects);
  `rejects end_date before start_date`; `rejects overlapping versions of the same institution but
  allows them across different institutions`.
- [ ] **Step 2:** `pnpm --filter @gpip/db test` → Expected: FAIL.
- [ ] **Step 3:** Implement schema, `drizzle.config.ts` (dialect postgresql, out `./migrations`),
  run `pnpm --filter @gpip/db exec drizzle-kit generate`, then
  `drizzle-kit generate --custom --name=constraints` and fill the SQL above. `createTestDb` loads
  PGlite with the `btree_gist` contrib extension and runs `migrateDb`. Add package scripts
  `db:generate`, `db:migrate` (root aliases too).
- [ ] **Step 4:** `pnpm --filter @gpip/db test` → Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): political, institutional and source schema with integrity constraints`

---

### Task 4: Verified administration seed and repositories

**Files:**
- Create: `packages/db/src/seed/data/{sources,parties,persons,administrations,leaders,sectors}.ts`,
  `src/seed/seed.ts`, `src/seed/cli.ts`, `src/repositories/administrations.ts`,
  `src/repositories/institutions.ts`, tests `src/seed/seed.test.ts`,
  `src/repositories/administrations.test.ts`, `src/repositories/institutions.test.ts`
- Modify: `packages/core/src/schemas.ts` (+ test) — Zod schemas validating seed records.

**Interfaces:**
- Consumes: `createTestDb`, `Db` (Task 3); `parseIsoDate`, `Tenure` (Task 2).
- Produces:
  ```ts
  // core/schemas.ts
  const AdministrationSeedSchema: z.ZodType<{ slug: string; name: string; kind: 'civilian'|'military'|'transitional';
    partySlug: string | null; startDate: IsoDate; endDate: IsoDate | null; sourceKey: string; notes?: string }>
  const LeaderSeedSchema, SourceSeedSchema   // analogous
  // db
  function seed(db: Db): Promise<{ inserted: number; updated: number }>   // idempotent upsert by natural key; all rows reviewStatus 'published', provenance 'manual'; writes change_log on insert/update
  interface AdministrationSummary { slug; name; kind; startDate: IsoDate; endDate: IsoDate | null;
    party: { slug: string; name: string; abbreviation: string } | null;
    leaders: { role: LeaderRole; personSlug: string; fullName: string; label: string | null; startDate: IsoDate; endDate: IsoDate | null }[] }
  interface AdministrationDetail extends AdministrationSummary {
    notes: string | null; source: { title: string; publisher: string; url: string; retrievedOn: IsoDate };
    previous: { slug: string; name: string } | null; next: { slug: string; name: string } | null }
  function listAdministrations(db: Db): Promise<AdministrationSummary[]>      // start_date asc, published only
  function getAdministration(db: Db, slug: string): Promise<AdministrationDetail | null>
  function listPersonTenures(db: Db, personSlug: string): Promise<Tenure[]> // leader periods as head of state/government — "compare by person"
  function getInstitutionHistory(db: Db, slug: string): Promise<{ versions: …[]; lineage: …[] } | null>
  ```

**Seed values (verify each against the cited source; if a source disagrees, use the source's
date, note it in the PR, and update this table):**

| slug | kind | party | start → end | leaders (role: person, from→to) |
|---|---|---|---|---|
| 1957-dominion | civilian | CPP | 1957-03-06 → 1960-07-01 | HoS: Elizabeth II (label "Queen of Ghana"); HoG: Kwame Nkrumah (Prime Minister) |
| 1960-first-republic | civilian | CPP | 1960-07-01 → 1966-02-24 | HoS: Kwame Nkrumah |
| 1966-nlc | military | — | 1966-02-24 → 1969-10-01 | HoS: J. A. Ankrah → 1969-04-02; A. A. Afrifa 1969-04-02 → |
| 1969-second-republic | civilian | PP | 1969-10-01 → 1972-01-13 | HoG: K. A. Busia; HoS: A. A. Afrifa ("Chairman, Presidential Commission") → 1970-08-31; Edward Akufo-Addo 1970-08-31 → |
| 1972-nrc | military | — | 1972-01-13 → 1975-10-09 | HoS: I. K. Acheampong |
| 1975-smc-i | military | — | 1975-10-09 → 1978-07-05 | HoS: I. K. Acheampong |
| 1978-smc-ii | military | — | 1978-07-05 → 1979-06-04 | HoS: F. W. K. Akuffo |
| 1979-afrc | military | — | 1979-06-04 → 1979-09-24 | HoS: J. J. Rawlings |
| 1979-third-republic | civilian | PNP | 1979-09-24 → 1981-12-31 | HoS: Hilla Limann; VP: J. W. S. de Graft-Johnson |
| 1981-pndc | military | — | 1981-12-31 → 1993-01-07 | HoS: J. J. Rawlings |
| 1993-rawlings-i | civilian | NDC | 1993-01-07 → 1997-01-07 | HoS: J. J. Rawlings; VP: K. N. Arkaah |
| 1997-rawlings-ii | civilian | NDC | 1997-01-07 → 2001-01-07 | HoS: J. J. Rawlings; VP: J. E. A. Mills |
| 2001-kufuor-i | civilian | NPP | 2001-01-07 → 2005-01-07 | HoS: J. A. Kufuor; VP: Aliu Mahama |
| 2005-kufuor-ii | civilian | NPP | 2005-01-07 → 2009-01-07 | same |
| 2009-mills-mahama | civilian | NDC | 2009-01-07 → 2013-01-07 | HoS: J. E. A. Mills → 2012-07-24; J. D. Mahama 2012-07-24 →; VP: J. D. Mahama → 2012-07-24; K. B. Amissah-Arthur 2012-08-06 → |
| 2013-mahama-i | civilian | NDC | 2013-01-07 → 2017-01-07 | HoS: J. D. Mahama; VP: K. B. Amissah-Arthur |
| 2017-akufo-addo-i | civilian | NPP | 2017-01-07 → 2021-01-07 | HoS: Nana Akufo-Addo; VP: Mahamudu Bawumia |
| 2021-akufo-addo-ii | civilian | NPP | 2021-01-07 → 2025-01-07 | same |
| 2025-mahama-ii | civilian | NDC | 2025-01-07 → null | HoS: J. D. Mahama; VP: Jane Naana Opoku-Agyemang |

Parties: CPP (Convention People's Party), PP (Progress Party), PNP (People's National Party),
NDC (National Democratic Congress), NPP (New Patriotic Party). Sectors: economy, agriculture,
education, health, infrastructure, social-development. Every row's `sourceKey` points to a
`sources.ts` entry with a real URL and `retrievedOn`; prefer official (Presidency, Parliament,
Electoral Commission) then reputable reference works.

- [ ] **Step 1: Write failing tests**
  - `seed.test.ts`: `seeds 19 administrations`; `is idempotent` (seed twice →
    `listAdministrations` length 19, second run `{ inserted: 0 }`); `every administration has a
    source with a url`; `exactly one administration is open-ended and it is 2025-mahama-ii`;
    `administrations tile the timeline` (each `endDate` equals the next `startDate`).
  - `core/schemas.test.ts`: rejects `startDate: '2023-02-30'`; rejects `kind: 'democratic'`.
  - `administrations.test.ts`: `lists in chronological order`; `getAdministration('2009-mills-mahama')`
    has two head_of_state leaders in date order and `previous.slug === '2005-kufuor-ii'`;
    `getAdministration('1957-dominion').previous` is null and `getAdministration('2025-mahama-ii').next`
    is null; unknown slug → null; `listPersonTenures('jerry-john-rawlings')` returns 4 tenures
    (AFRC, PNDC, two NDC terms); draft rows are excluded from lists.
  - `institutions.test.ts`: fixture institution renamed once → history returns 2 versions in
    order and 1 `renamed` lineage edge; unknown slug → null.
- [ ] **Step 2:** `pnpm --filter @gpip/core --filter @gpip/db test` → Expected: FAIL.
- [ ] **Step 3:** Implement data files (validated through the Zod schemas at seed time), `seed`
  (single transaction, `onConflictDoUpdate` by natural key, change_log row per insert/update),
  repositories (one query + in-memory grouping for leaders; no N+1), `cli.ts` → root script
  `pnpm db:seed`.
- [ ] **Step 4:** Tests → Expected: PASS. Then `pnpm db:migrate && pnpm db:seed` against
  local PGlite → Expected: `inserted: 19…` printed.
- [ ] **Step 5: Commit** `feat(db): verified 1957–present administration seed and repositories`

---

### Task 5: Public site shell — directory, profile, notice

**Files:**
- Create: `apps/web/*` per File Structure; `apps/web/playwright.config.ts`;
  `components/*.test.tsx` (Vitest + Testing Library, jsdom) for components.

**Interfaces:**
- Consumes: `createDb`, `migrateDb`, `listAdministrations`, `getAdministration`,
  `AdministrationSummary`, `AdministrationDetail` (Task 4).
- Produces: routes `/` (links to `/history`), `/history` (section landing listing the nine areas
  from spec §6; only "Administration directory" is a link in this plan, the rest labelled
  "Coming soon"), `/history/administrations`, `/history/administrations/[slug]`, `/data-notice`;
  `lib/db.ts` → `getDb(): Promise<Db>` (module-level singleton from `process.env.DATABASE_URL`);
  `<NotAvailable />` (renders "Not available" with `aria-label`) reused by later plans.

- [ ] **Step 1: Write failing tests**
  - `SiteFooter.test.tsx`: renders the verbatim footer notice (Global Constraints) and a link to
    `/data-notice`.
  - `AdministrationTimeline.test.tsx`: given 3 summaries renders them in given order; an
    incumbent renders "7 Jan 2025 – present"; renders no colours derived from party (assert no
    `style`/class containing the party slug); military administrations show "Military government"
    not a party name.
  - `e2e/history.spec.ts` (Playwright, against `next start` with a freshly seeded PGlite dir):
    directory lists "Kwame Nkrumah" first and "John Dramani Mahama" last;
    clicking "2009–2013" profile shows "John Evans Atta Mills" and "John Dramani Mahama" with
    their dates, a source link with an `href`, and previous/next links; footer notice visible on
    every visited page; `/history/administrations/unknown` → 404; `/data-notice` contains the
    headings "Sources and licences", "No endorsement", "Figures as published",
    "In office is not causation", "No warranty", "Corrections", "Contact".
- [ ] **Step 2:** `pnpm --filter @gpip/web test && pnpm e2e` → Expected: FAIL.
- [ ] **Step 3:** Implement with React Server Components only (zero client JS on these pages);
  plain CSS modules with `:root` tokens, neutral palette, mobile-first, system font stack. Profile
  shows: name, dates, kind, party or "Military government", leaders with roles and dates, notes,
  source (publisher, title, link, retrieved date), previous/next navigation, and the line
  "Commitments, budgets and indicators for this administration will appear here as they are
  verified." Data notice page uses spec §11 item 10 content with the contact
  `mailto:` taken from env `GPIP_CONTACT_EMAIL` (shows "Not available" if unset).
  `e2e` script: build, migrate + seed into `.data/e2e`, `next start`, run Playwright.
- [ ] **Step 4:** `pnpm check && pnpm build && pnpm e2e` → Expected: all PASS.
- [ ] **Step 5: Commit** `feat(web): history section shell with administration directory, profiles and data notice`

---

## Done when

`pnpm check && pnpm build && pnpm e2e` pass locally and in CI on `main`; every task's PR has a
Codex review addressed; GitHub issues for Tasks 1–5 are closed by their PRs.
