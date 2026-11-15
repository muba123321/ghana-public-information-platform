# Plan 4 · Compare — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors compare 2–4 governments or leaders on one topic, with each tenure's inherited baseline, end value, average, change and coverage. Show the same summaries on every government profile, and publish a methodology page explaining the rules.

**Architecture:** Two pure rule modules in `@gpip/core` hold all the logic: `tenureSummary` and `leaderStretches`. A new `features/compare` slice in `apps/web` turns them into a comparison model. It also provides the Compare page, `/api/v1/compare` (JSON and CSV) and the profile section. The methodology page is a static page in `features/overview`.

**Tech Stack:** TypeScript 5.9 strict, Next.js 16 App Router, Drizzle, ECharts 6 (already used by the indicator charts), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-compare-regions-launch-design.md` (Part 1). The parent spec is `docs/superpowers/specs/2026-11-09-gpip-government-performance-design.md` (§6 area 5, §7, §11.1, §11.2, §11.8).

## Global Constraints

- No scores, ranks or "better/worse" wording anywhere. Governments are listed only in date order. Lines are toned by selection position (a/b/c/d), never by party.
- Missing values stay `null` and display as "Not available". Nothing is zero-filled or interpolated.
- Projections (`estimateType: 'projected'`) are excluded from every summary. Modelled values are included and flagged.
- `change` is in the indicator's own unit. Percent indicators give percentage points, never a percent of a percent.
- `end` is the value of the last associated period that has a value, always shown with its year.
- The caveat "Being in office is not the same as causing a change." is visible on Compare and on the profile section.
- The `AGENTS.md` structure rules apply, enforced by `apps/web/src/architecture.test.ts`:
  - pages are thin;
  - only `server/` code imports `@gpip/db`;
  - features talk to each other only through `index.ts`;
  - components are `PascalCase.tsx` with a `PascalCase.module.css`;
  - e2e tests locate elements by role, label or heading.
- Exact dependency versions; no new dependencies in this plan.
- TDD for every task. `pnpm check` and `pnpm e2e` stay green. Conventional commits with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A tenure shorter than one full period** (AFRC 1979, about 3 months; SMC II) has no associated years. Its summary must be all `null` with coverage `0/0`. It must not crash, divide by zero or show 0. Covered in Task 1.
2. **A selected government with no data for an indicator** at all (e.g. poverty before 1987) should give a row of "Not available" and no line, while the other governments still render. Covered in Task 4.
3. **Bad query strings:**
   - unknown slugs are dropped;
   - duplicates are removed;
   - more than 4 selections are capped at 4;
   - fewer than 2 valid selections shows the picker with a prompt, not an error;
   - an unknown topic falls back to the first topic.

   Covered in Task 3.
4. **The sitting government (end `null`)**:
   - its unfinished current year is excluded from `end` and `average`;
   - its tenure is measured up to `today`;
   - its summaries never claim a final value.

   Covered in Task 1.
5. **Phone width:** the small-multiple charts stack one per row and the table scrolls horizontally inside its own box. The page must not scroll sideways. Covered in Task 5 (e2e at 390 px).

---

### Task 1: `tenureSummary` in core

**Files:**
- Create: `packages/core/src/tenure-summary.ts`, `packages/core/src/tenure-summary.test.ts`
- Modify: `packages/core/src/index.ts` (export)

**Interfaces:**
- Consumes: `associate`, `inheritedBaseline`, `Tenure`, `ObservationPoint`, `Frequency`, `IsoDate` (existing).
- Produces:
  ```ts
  export interface TenureSummary {
    baseline: { year: number; value: number | null } | null; // null = no data before the tenure
    end: { year: number; value: number } | null;            // last associated period WITH a value
    average: number | null;
    change: number | null;                                   // end.value − baseline.value
    coverage: { withValue: number; total: number };
    sparse: boolean;                                         // withValue < total / 2
    modelled: boolean;                                       // any summarised point is modelled
    transitionYears: number[];                               // associated years shared with another tenure
    points: { year: number; value: number | null }[];        // the associated series, in order
  }
  export function tenureSummary(
    points: readonly ObservationPoint[], tenure: Tenure, all: readonly Tenure[],
    frequency: Frequency, today: IsoDate,
  ): TenureSummary
  ```

- [ ] **Step 1: Write failing tests** in `tenure-summary.test.ts`. Use an annual series built with `annualPeriod(y)`, and the tenures `{slug:'a', start:'2001-01-07', end:'2009-01-07'}` and `{slug:'b', start:'2009-01-07', end:null}`.
  - `'associates years by majority and summarises them'`:
    - for `a` with values 2000=10, 2001..2008=12..19: `baseline` = `{year:2000,value:10}`, `end` = `{year:2008,value:19}`, `average` = 15.5, `change` = 9, `coverage` = `{withValue:8,total:8}`;
    - 2009 belongs to `b` and is in neither `a`'s points nor `transitionYears`. It is a transition year for `b`, since `a` has 6 days of it.
  - `'end is the last year that has a value, labelled with its year'`: `b` with 2024=5 and 2025=null, `today` 2026-11-15. Then `end` = `{year:2024,value:5}`, and 2026 is not associated (the period is incomplete: its end is after `today`).
  - `'never counts a missing value as zero'`: values 10, null, 20 give `average` = 15 and `coverage` = `{withValue:2,total:3}`.
  - `'a tenure shorter than a year has nothing to summarise'`: `{slug:'x', start:'1979-06-04', end:'1979-09-24'}` gives `end:null`, `average:null`, `change:null`, `coverage:{withValue:0,total:0}`, `sparse:false`, `points:[]`.
  - `'projections are left out and modelled values are flagged'`: a projected point is absent from `points`; a modelled point present sets `modelled:true`.
  - `'change is null when the baseline value is missing'`: baseline `{year:2000,value:null}` gives `change:null`.
- [ ] **Step 2:** Run `pnpm --filter @gpip/core exec vitest run src/tenure-summary.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `tenureSummary`.**
  - A period is *complete* when its `end` ≤ `today`.
  - Only complete, non-projected periods are associated. A period is associated when `associate(period, all, today).primary === tenure.slug`, and `transitionYears` are those with `transition` true.
  - The baseline comes from `inheritedBaseline(tenure, nonProjectedSeries, frequency)`.
  - `sparse` is false when `total` is 0.
  - Export from `index.ts`.
- [ ] **Step 4:** Run the test again. Expected: PASS. Then run `pnpm check`. Expected: green.
- [ ] **Step 5: Commit** (`feat(core): tenure summaries — baseline, end, average, change, coverage`).

### Task 2: `leaderStretches` in core ("compare by person")

**Files:**
- Create: `packages/core/src/leader-stretches.ts`, `packages/core/src/leader-stretches.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Tenure`, `LeaderRole`, `IsoDate`.
- Produces:
  ```ts
  export interface LeaderTerm { slug: string; start: IsoDate; end: IsoDate | null;
    leaders: { role: LeaderRole; personSlug: string; fullName: string; startDate: IsoDate; endDate: IsoDate | null }[] }
  export interface LeaderStretch extends Tenure { personSlug: string; fullName: string } // slug = `${personSlug}-${startYear}`
  export function leaderStretches(terms: readonly LeaderTerm[]): LeaderStretch[] // ordered by start
  ```

- [ ] **Step 1: Write failing tests** with fixtures that copy the real seed shapes.
  - `'the person who led the government is the head of government where there is one'`: 1957 dominion (Queen = head of state, Nkrumah = head of government) followed by the 1960 republic (Nkrumah = head of state) gives one Nkrumah stretch, 1957-03-06 → 1966-02-24, and no Elizabeth II stretch.
  - `'a 1969–72 term goes to the Prime Minister'`: Akufo-Addo as head of state and Busia as head of government give a Busia stretch only.
  - `'a mid-term handover splits by leader dates'`: `2009-mills-mahama` with Mills to 2012-07-24 and then Mahama, followed by `2013-mahama-i`, gives Mills 2009-01-07 → 2012-07-24 and Mahama 2012-07-24 → 2017-01-07 as one stretch, `slug: 'john-dramani-mahama-2012'`.
  - `'separate periods in office stay separate'`: Rawlings in AFRC 1979 and in PNDC/NDC 1981–2001 gives two stretches, `jerry-john-rawlings-1979` and `jerry-john-rawlings-1981`.
  - `'a leader across two regimes is one stretch'`: Acheampong in NRC then SMC I is a single stretch.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement `leaderStretches`.**
  - Per term, at each leader's dates, pick the head of government if one serves at that time, otherwise the head of state.
  - Cut stretches at leader dates.
  - Merge adjacent stretches of the same person where one's end equals the next one's start.
- [ ] **Step 4:** Run it. Expected: PASS. Then `pnpm check`.
- [ ] **Step 5: Commit** (`feat(core): leader stretches for compare-by-person`).

### Task 3: Comparison model and query parsing (`features/compare`)

**Files:**
- Create: `apps/web/src/features/compare/comparison.ts` (+ `comparison.test.ts`), `apps/web/src/features/compare/compare-params.ts` (+ test), `apps/web/src/features/compare/server/queries.ts`, `apps/web/src/features/compare/index.ts`
- Modify: `packages/db/src/repositories/indicators.ts`: add `frequency: Frequency` to `IndicatorSummary` and to both selects, and extend its test with one assertion that `frequency` is `'annual'`.

**Interfaces:**
- Consumes: `tenureSummary`, `leaderStretches` (Tasks 1–2); `listAdministrations`, `listIndicators`, `getIndicatorSeries`, `listContextEvents`, `listSectors` via the feature's `server/queries.ts` (with `cache()`).
- Produces:
  ```ts
  // compare-params.ts
  export type CompareBy = 'term' | 'person';
  export interface CompareSelection { by: CompareBy; slugs: string[]; topic: string }
  export function parseCompareParams(
    search: { by?: string; a?: string; b?: string; c?: string; d?: string; topic?: string },
    known: { terms: readonly string[]; persons: readonly string[]; topics: readonly string[] },
  ): CompareSelection & { ready: boolean } // ready = slugs.length >= 2
  // comparison.ts
  export interface ComparedTenure { key: string; label: string; years: string; tone: 'a'|'b'|'c'|'d'; tenures: Tenure[] }
  export interface ComparisonRow { tenureKey: string; stretchLabel: string; summary: TenureSummary }
  export interface ComparisonIndicator { code: string; name: string; unit: string; rows: ComparisonRow[] }
  export interface Comparison { by: CompareBy; topic: string; tenures: ComparedTenure[]; indicators: ComparisonIndicator[];
    events: { date: IsoDate; title: string; url: string; publisher: string }[] } // events inside any compared tenure
  export function buildComparison(input: { selection: CompareSelection; terms: LeaderTerm[];
    indicators: { code: string; name: string; unit: string; frequency: Frequency; points: ObservationPoint[] }[];
    events: ContextEvent[]; today: IsoDate }): Comparison
  // server/queries.ts
  export const loadCompareOptions: () => Promise<{ terms: {slug;name;years}[]; persons: {slug;name;years}[]; topics: {slug;name}[] }>
  export const loadComparison: (s: CompareSelection) => Promise<Comparison>
  ```
  `persons` are leader stretches grouped by `personSlug`. A person's key is `personSlug`, and the `tenures` array lists every stretch of that person.

- [ ] **Step 1: Write failing tests.**
  - `compare-params.test.ts`:
    - `'keeps two to four known selections in the order given'`;
    - `'drops unknown and duplicate slugs and caps at four'`: input a=x, b=x, c=nope, d=y, plus extra slugs, gives `['x','y']`;
    - `'is not ready with fewer than two'`;
    - `'falls back to the first topic'`;
    - `'by=person validates against persons, not terms'`.
  - `comparison.test.ts`:
    - `'gives every selected tenure a row for every indicator in the topic'`;
    - `'a tenure with no data gets an all-null row, not a missing one'`;
    - `'tones follow selection order a, b, c, d'`;
    - `'by person, each separate stretch is its own row labelled with its years'` (e.g. Rawlings 1979 and 1981–2001);
    - `'events are only those inside a compared tenure'`.
- [ ] **Step 2:** Run `pnpm --filter @gpip/web exec vitest run src/features/compare`. Expected: FAIL.
- [ ] **Step 3: Implement** `parseCompareParams`, `buildComparison` and `server/queries.ts`. The query file imports `server-only`. Its `loadComparison` loads the topic's indicators and each one's latest-vintage series, then calls `buildComparison`. Add `frequency` to `IndicatorSummary`.
- [ ] **Step 4:** Run the tests. Expected: PASS. Then `pnpm check` (the architecture test included).
- [ ] **Step 5: Commit** (`feat(web): comparison model and compare parameters`).

### Task 4: Compare page, chart, table, CSV and API

**Files:**
- Create in `apps/web/src/features/compare/components/`:
  - `ComparePicker.tsx` (GET form: by, a–d, topic);
  - `CompareChart.tsx`: `'use client'`, ECharts, one small multiple;
  - `CompareTable.tsx`;
  - `CompareView.tsx`;
  - each with a `.module.css`.
- Create the route: `apps/web/src/app/(public)/history/compare/page.tsx`.
- Create the API: `apps/web/src/app/api/v1/compare/route.ts` (JSON; CSV when `?format=csv`).
- Create: `apps/web/e2e/compare.spec.ts`.
- Modify:
  - `components/layout/SiteHeader.tsx`: add a "Compare" nav link;
  - `features/overview/components/ModuleOverview.tsx`: give "Compare administrations" `href: '/history/compare'`, which removes its "Coming soon" pill.

**Interfaces:**
- Consumes: Task 3's `parseCompareParams`, `loadCompareOptions`, `loadComparison`, `Comparison`; `toCsv` and `formatValue` from `@/features/indicators`; `CACHE_HEADERS` and `API_LICENCE` from `@/server/api`.
- Produces: the page at `/history/compare` and the endpoint `/api/v1/compare`. Same parameters on both.

**What the page shows, top to bottom:**
1. `PageHeader`, titled "Compare governments", with the lede "Side by side, each from the figure it inherited. No scores."
2. `ComparePicker`.
3. When ready, the caveat paragraph: "Being in office is not the same as causing a change.", with a link to `/methodology`.
4. One `<section>` per indicator, each containing:
   - an `h2` with the indicator name and unit;
   - a `CompareChart`: x axis = years in office, 0 = inherited baseline; a toggle switches to calendar years; one line per row, toned by its tenure's tone; a hollow baseline dot; the end point labelled with its year and value; transition years drawn hatched; modelled points marked;
   - a `<details>` "Show the figures" holding the `CompareTable`. Its columns are Government, Inherited (year), Last figure (year), Average, Change, Years with figures. Nulls render `NotAvailable`.
5. "Events in these years": the `event-list`.
6. Download links: CSV and JSON.

When the selection isn't ready, the page shows the picker and the callout "Choose at least two governments to compare."

- [ ] **Step 1: Write the failing e2e test**, `compare.spec.ts`:
  - `'compares two governments on one topic from the picker'`:
    - go to `/history/compare`;
    - select two governments in the "First government" and "Second government" selects, and the "Economy" topic, then press "Compare";
    - the URL has `a=` and `b=`;
    - a heading matches `/Inflation/`;
    - "Show the figures" reveals a table with two rows, which has columns "Inherited" and "Change";
    - the text "Being in office is not the same as causing a change." is visible.
  - `'a government with no figures shows Not available, never zero'`: pick 1957-dominion and 2017-akufo-addo-i on the topic that holds `poverty`. The 1957 row contains "Not available".
  - `'compare by person groups separate periods in office'`: `?by=person&a=jerry-john-rawlings&b=john-agyekum-kufuor&topic=economy` gives table rows for "Jerry John Rawlings (1979)" and "Jerry John Rawlings (1981–2001)".
  - `'the API returns the same comparison as JSON and CSV'`: `/api/v1/compare?a=…&b=…&topic=economy` returns 200 with `tenures.length === 2`; `&format=csv` has a `text/csv` content type and a header row starting with `indicator,government`.
  - `'the page does not scroll sideways on a phone'`: at a viewport of 390×844, `document.documentElement.scrollWidth <= 390`.
- [ ] **Step 2:** Run `pnpm turbo run e2e --force`. Expected: these tests FAIL (404).
- [ ] **Step 3: Implement** the components, page and route. The page stays thin: parse params, load options and the comparison, render `CompareView`. The `CompareChart` options builder is a pure function, `compareChartOptions(indicator, tenures, mode)`, in `features/compare/chart-options.ts`, with a unit test asserting:
  - the baseline point is at x = 0;
  - null values are gaps, never 0;
  - series colours come from the tone CSS variables `--tone-a`…`--tone-d`, which are defined in `CompareView.module.css` and use the neutral chronology palette.
- [ ] **Step 4:** Run `pnpm check`, then `pnpm turbo run e2e --force`. Expected: all pass, including the 33 existing tests.
- [ ] **Step 5: Commit** (`feat(web): compare governments — page, charts, table, CSV and API`).

### Task 5: "Indicators in this term" on every government profile

**Files:**
- Create: `apps/web/src/features/compare/components/TermIndicators.tsx` (+ `.module.css`, + `TermIndicators.test.tsx`)
- Modify:
  - `features/compare/server/queries.ts`: add `loadTermIndicators(slug)`;
  - `features/administrations/components/AdministrationProfile.tsx`: add a `children` slot;
  - `app/(public)/history/administrations/[slug]/page.tsx`: render `TermIndicators` into that slot.
- Remove the sentence "Budgets and indicators for this government are on each commitment and indicator page."

**Interfaces:**
- Consumes: `tenureSummary`, `Sparkline` from `@/features/indicators`, `NotAvailable`.
- Produces: `loadTermIndicators(slug: string): Promise<{ code; name; unit; summary: TenureSummary }[]>`, covering all 16 indicators in sector order, the same set for every government.

- [ ] **Step 1: Write the failing component test**, `TermIndicators.test.tsx`:
  - `'shows inherited, last figure with its year, change and coverage for each indicator'`;
  - `'shows Not available, never 0, when a summary is empty'`;
  - `'links each indicator to its page and to Compare'`: the href contains `/history/compare?a=<slug>`.

  Add one e2e assertion to the existing profile test: the `/history/administrations/2017-akufo-addo-i` page has a heading "Indicators in this term" and the caveat text.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement.** The section is a compact table (indicator, inherited, last figure, change, sparkline of `summary.points`), with the caveat line under the heading. The administrations feature doesn't import compare: the page composes both. Profiles keep `AdministrationProfile`, and the page passes `<TermIndicators …/>` as children.
- [ ] **Step 4:** Run `pnpm check` and the e2e suite. Expected: PASS.
- [ ] **Step 5: Commit** (`feat(web): indicators in this term on every government profile`).

### Task 6: Methodology page and links

**Files:**
- Create: `apps/web/src/features/overview/components/Methodology.tsx` (+ `.module.css`), and the route `apps/web/src/app/(public)/methodology/page.tsx`.
- Modify:
  - `components/layout/SiteFooter.tsx`: add a "How we compare" link next to "Data notice & disclaimer". Leave the fixed notice text untouched.
  - `features/indicators/components/IndicatorProfile.tsx`: in "How to read this", add a link "How periods and baselines work" to `/methodology`.
- Add e2e coverage in `e2e/history.spec.ts`.

- [ ] **Step 1: Write the failing e2e test** `'the methodology page explains every rule Compare uses'`. `/methodology` has `h2` headings exactly:
  - "Which government a year belongs to"
  - "The inherited starting point"
  - "Last figure, average and change"
  - "Years with figures"
  - "Modelled figures and projections"
  - "Comparing people, not just terms"
  - "Why there are no scores"
  - "Effects take time"

  The footer link "How we compare" leads to it.
- [ ] **Step 2:** Run it. Expected: FAIL (404).
- [ ] **Step 3: Write the page** in plain English, one short section per heading. Each section states the rule exactly as Tasks 1–2 implement it:
  - majority of the year in office;
  - transition years marked;
  - the baseline is the last complete year before taking office, with no fallback to older years;
  - `end` is the last year with a figure, labelled;
  - change is in the indicator's own unit;
  - coverage;
  - projections excluded and modelled values flagged;
  - head of government where one exists, and separate stretches kept separate;
  - no scores;
  - the delayed-effect caveat.

  Add `export const metadata = { title: 'How we compare' }`.
- [ ] **Step 4:** Run `pnpm check` and `pnpm turbo run e2e --force`. Expected: PASS.
- [ ] **Step 5: Commit** (`feat(web): methodology page`).

### Task 7: Review and PR

- [ ] **Step 1:** Run `pnpm check && pnpm build && pnpm turbo run e2e --force`. Expected: all green.
- [ ] **Step 2:** Run `codex review --base main` and one fresh whole-branch review (most capable model) against this plan's Review Focus. Fix findings test-first.
- [ ] **Step 3:** Open the PR: "Plan 4: Compare governments", with `Closes` on the Compare part of epic #8. The epic stays open for Plans 5–6. Add it to project board 1. The PR includes the design (`2026-11-15-compare-regions-launch-design.md`, plus its assets) and this plan.
