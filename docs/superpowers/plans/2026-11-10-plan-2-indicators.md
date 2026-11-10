# Plan 2 — Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sixteen national indicators from 1960 to today, imported automatically from the World
Bank and IMF with every value's source, release and estimate type kept; shown as charts with each
government's term shaded and key context events marked, with a table alternative, CSV download
and a public read-only API.

**Architecture:** `core` gains indicator series rules (series selection, year-on-year change,
estimate types). `db` gains indicators, observations (append-only by vintage), targets, context
events and import runs, plus a verified indicator catalogue and context-event seed. A new
`packages/ingest` runs source adapters through one pipeline that writes a new vintage only when
published values change. `web` adds indicator pages using ECharts (loaded only on those pages),
reusing the ribbon geometry for administration bands, and `/api/v1` route handlers.

**Tech Stack:** as Plan 1, plus ECharts 6.1.0 (client component, dynamic import).

**Spec:** `docs/superpowers/specs/2026-11-09-gpip-government-performance-design.md`
(§4 API path, §5 Indicators, §6 areas 4 & 8, §7, §11 items 3, 6, 7)

## Global Constraints

- Everything in Plan 1's Global Constraints and `AGENTS.md` still applies.
- Observations are **append-only**: a changed published value is a new row with a new `vintage`;
  nothing is overwritten. Default view = latest vintage of the indicator's preferred source.
- `estimate_type` ∈ `reported | modelled | projected`. Projected values are never drawn or tabled
  as actuals: separate dashed series labelled "IMF projection", excluded from summaries.
- Missing years are gaps (ECharts `connectNulls: false`) and "Not available" in tables, never 0.
- Indicators carry **no** "good direction" field; charts never colour rises/falls as good/bad.
- Administration bands use the ribbon's neutral tones (alternating by position, military hatched),
  labelled "In office during", never by party.
- Network calls: 25 s timeout, 2 retries with backoff; tests never hit the network (fixtures).
- ECharts loads only on indicator pages (dynamic import); every chart has a server-rendered table.

## Review Focus

1. **World Bank API stalls or paginates** (observed: some calls hang; `pages > 1`) — import must
   time out, retry, follow pages, and record a failed run without writing partial data. → Task 4.
2. **IMF DataMapper ignores the country filter and returns forecasts to 2031** — adapter must
   select `GHA` and mark years ≥ the retrieval year as `projected`. → Task 4.
3. **Re-import with unchanged data** — no new vintage, no duplicate rows; a single revised value
   creates one new vintage for the whole series. → Task 3.
4. **Series with sparse years** (poverty: 7 survey years 1987–2016) — chart shows points, not a
   line implying values in between; table lists only real years. → Task 6.
5. **CSV injection / API abuse** — CSV cells starting `= + - @` are prefixed; unknown indicator →
   404 JSON; responses are cacheable (`s-maxage`). → Task 7.

## Indicator catalogue (spec §9, verified 2026-11-10 against the live APIs)

| code (GPIP) | name | source | series code | unit | estimate type | sector | coverage |
|---|---|---|---|---|---|---|---|
| gdp-growth | GDP growth | World Bank WDI | NY.GDP.MKTP.KD.ZG | % per year | reported | economy | 1961– |
| inflation | Inflation, consumer prices | World Bank WDI | FP.CPI.TOTL.ZG | % per year | reported | economy | 1965– |
| exchange-rate | Cedis per US dollar (average) | World Bank WDI | PA.NUS.FCRF | GHS per USD | reported | economy | 1960– |
| public-debt | Government gross debt | IMF WEO | GGXWDG_NGDP | % of GDP | reported/projected | economy | 1990–2031 |
| fiscal-balance | Government net lending/borrowing | IMF WEO | GGXCNL_NGDP | % of GDP | reported/projected | economy | 1980–2031 |
| gov-revenue | Government revenue | IMF Public Finances in Modern History | rev | % of GDP | reported | economy | 1962–2024 |
| gov-expenditure | Government expenditure | IMF Public Finances in Modern History | exp | % of GDP | reported | economy | 1962–2024 |
| unemployment | Unemployment | World Bank WDI (ILO) | SL.UEM.TOTL.ZS | % of labour force | modelled | social-development | 1991– |
| poverty | Poverty headcount at $3.00/day (2021 PPP) | World Bank WDI | SI.POV.DDAY | % of population | reported | social-development | 7 survey years |
| population | Population | World Bank WDI | SP.POP.TOTL | people | reported | social-development | 1960– |
| primary-enrolment | Primary school enrolment (gross) | World Bank WDI (UNESCO) | SE.PRM.ENRR | % gross | reported | education | 1971– |
| secondary-enrolment | Secondary school enrolment (gross) | World Bank WDI (UNESCO) | SE.SEC.ENRR | % gross | reported | education | 1971– |
| under5-mortality | Under-5 mortality | World Bank WDI (UN IGME) | SH.DYN.MORT | per 1,000 live births | modelled | health | 1960– |
| maternal-mortality | Maternal mortality ratio | World Bank WDI (WHO) | SH.STA.MMRT | per 100,000 live births | modelled | health | 1985– |
| electricity-access | Access to electricity | World Bank WDI | EG.ELC.ACCS.ZS | % of population | reported | infrastructure | 1993– |
| water-access | Basic drinking water | World Bank WDI (WHO/UNICEF JMP) | SH.H2O.BASW.ZS | % of population | reported | infrastructure | 2000– |
| cereal-production | Cereal production | World Bank WDI (FAO) | AG.PRD.CREL.MT | tonnes | reported | agriculture | 1961– |

(17 rows; population is the per-capita denominator for Plan 4.) Each needs a one-sentence
plain-English definition and a methodology note (e.g. exchange-rate: "Shown in today's cedis; the
2007 redenomination (10,000 old cedis = 1 GHS) is applied to earlier years by the publisher").

## Context events (seed; verify each date and cite a source URL before publishing)

| date | title (neutral, factual) | kind |
|---|---|---|
| 2007-07-01 | Cedi redenominated: 10,000 old cedis became 1 Ghana cedi | methodology |
| 2008-09-15 | Global financial crisis | international |
| 2010-11-05 | GDP re-based to 2006 prices by the Ghana Statistical Service | methodology |
| 2014-09-? | GDP re-based to 2013 prices | methodology |
| 2015-04-03 | IMF Extended Credit Facility programme approved | domestic |
| 2020-03-11 | COVID-19 declared a pandemic by the WHO | international |
| 2022-12-19 | Suspension of payments on most external debt announced | domestic |
| 2023-05-17 | IMF Extended Credit Facility programme approved | domestic |

Dates marked `?` or unverifiable must be confirmed against the cited source or dropped.

---

### Task 1: Core indicator series rules (`@gpip/core`)

**Files:** Create `packages/core/src/indicator.ts` (+ test); modify `schemas.ts` (+ test), `index.ts`.

**Interfaces — Produces:**
```ts
type EstimateType = 'reported' | 'modelled' | 'projected'
interface ObservationPoint { period: Period; value: number | null; estimateType: EstimateType; vintage: IsoDate }
function latestVintage(points: readonly ObservationPoint[]): IsoDate | null
function seriesAt(points: readonly ObservationPoint[], vintage: IsoDate): ObservationPoint[]   // one point per period, sorted by period.start
function splitProjected(points): { actual: ObservationPoint[]; projected: ObservationPoint[] }
function yearOnYear(points): { period: Period; change: number | null }[]   // null if either side missing
function annualFromYear(year: string): Period                              // '2017' → annualPeriod(2017), RangeError if not 4 digits
const IndicatorSeedSchema  // code slug, name, definition, unit, frequency, sectorSlug, sourceKey, seriesCode, estimateType, methodology?
const ContextEventSeedSchema // date IsoDate, title ≤ 90 chars, kind: 'international'|'methodology'|'domestic'|'institutional', sourceKey
```
- [ ] Tests: `latestVintage` of mixed vintages; `seriesAt` drops older-vintage duplicates for the
  same period and keeps periods only present in older vintages **out** (a vintage is a whole
  snapshot); `splitProjected`; `yearOnYear([2016:10, 2017:null, 2018:12])` → `[2017:null, 2018:null]`;
  `annualFromYear('19x0')` throws; schema rejects a title containing evaluative words
  (`/\b(success|failure|achiev|disaster|boom)\w*/i`).
- [ ] RED → implement → GREEN → commit `feat(core): indicator series rules and catalogue schemas`

### Task 2: Indicator schema and repositories (`@gpip/db`)

**Files:** `src/schema/indicators.ts` (+ export), migration, `src/repositories/indicators.ts` (+ test).

**Interfaces — Produces:**
- Tables: `indicators` (code pk, name, definition, unit, frequency, sector_slug fk, source_key,
  series_code, estimate_type, methodology, …editorialColumns); `observations` (id, indicator_code
  fk, period_start, period_end, geography default 'GHA', value numeric null, estimate_type,
  source_id fk not null, vintage date not null, unique(indicator_code, period_start, period_end,
  geography, source_id, vintage)); `targets` (id, indicator_code, administration_slug, period,
  value, source_id not null, …editorialColumns); `context_events` (id, date, title, kind,
  source_id not null, …editorialColumns); `import_runs` (id, source_key, started_at, finished_at,
  status 'ok'|'failed', indicators_checked, vintages_written, error text).
- ```ts
  listIndicators(db): Promise<IndicatorSummary[]>          // published, grouped-ready: code, name, unit, sectorSlug, firstYear, lastYear
  getIndicatorSeries(db, code, opts?: { vintage?: IsoDate }): Promise<IndicatorSeries | null>
  // IndicatorSeries = { indicator; source: {publisher,title,url,retrievedOn,licence}; vintage; vintages: IsoDate[]; points: ObservationPoint[] }
  listContextEvents(db, range?: Period): Promise<ContextEvent[]>
  ```
- [ ] Tests: unique constraint rejects a duplicate (indicator, period, source, vintage); value may
  be null but never coerced to 0 on read; `getIndicatorSeries` returns only the latest vintage by
  default and a requested older vintage when asked; unknown code → null; drafts excluded.
- [ ] RED → implement → GREEN → commit `feat(db): indicator, observation, target and context-event schema`

### Task 3: Catalogue + context-event seed and the import pipeline (`@gpip/ingest`)

**Files:** `packages/db/src/seed/data/{indicators,contextEvents}.ts` (+ sources entries: World Bank
WDI CC BY 4.0, IMF WEO, IMF FPP — URLs to dataset pages); `packages/ingest/{package.json,src/pipeline.ts,src/http.ts,src/types.ts}` (+ tests).

**Interfaces — Produces:**
```ts
interface RawPoint { year: string; value: number | null; estimateType: EstimateType }
interface SourceAdapter { sourceKey: string; fetch(seriesCode: string, ctx: { today: IsoDate }): Promise<RawPoint[]> }
function fetchJson(url: string, opts?: { fetchImpl?: typeof fetch; timeoutMs?: number; retries?: number }): Promise<unknown>
function runImport(db: Db, adapter: SourceAdapter, opts: { today: IsoDate }): Promise<ImportRunResult>
// ImportRunResult = { status: 'ok'|'failed'; indicatorsChecked: number; vintagesWritten: number; errors: string[] }
```
- `runImport` loads published indicators whose `sourceKey` matches, fetches each, converts years
  via `annualFromYear`, compares with the latest stored vintage (same periods, values,
  estimate types); if different, inserts **all** points with `vintage = today` in one transaction.
  One indicator failing doesn't block others; the run row records status and errors.
- [ ] Tests (fake adapter, PGlite): first run writes 1 vintage per indicator; identical second run
  writes 0; one changed value → exactly one new vintage containing the full series; adapter throw
  → run `failed` for that indicator, others still imported, no partial rows; `fetchJson` retries
  twice on timeout then throws (fake fetch).
- [ ] Seed tests: 17 indicators, each with a source; context events all have sources and pass
  the neutral-title rule.
- [ ] RED → implement → GREEN → commit `feat(ingest): import pipeline with vintages and run log`

### Task 4: World Bank and IMF adapters, CLI and schedule

**Files:** `packages/ingest/src/adapters/{worldbank,imf}.ts` (+ tests),
`packages/ingest/test/fixtures/*.json` (trimmed real responses for 2–3 series each, recorded
2026-11-10), `src/cli.ts`, `.github/workflows/ingest.yml`.

**Interfaces — Produces:** `worldBankAdapter: SourceAdapter` (sourceKey `world-bank-wdi`),
`imfWeoAdapter` (`imf-weo`), `imfFppAdapter` (`imf-fpp`); CLI `pnpm ingest [--source <key>] [--fixtures]`.
- World Bank: `https://api.worldbank.org/v2/country/GHA/indicator/{code}?format=json&per_page=100&page=N`;
  follow `pages`; skip `value: null` years (absent, not zero); estimate type from the catalogue.
- IMF: `https://www.imf.org/external/datamapper/api/v1/{code}`; read `values[code].GHA`; WEO years
  ≥ year(today) → `projected`; FPP never projected.
- `--fixtures` serves recorded fixtures through the same adapters (used by e2e and offline dev).
- Workflow: weekly cron + manual dispatch; runs `pnpm ingest` with secret `DATABASE_URL`; exits 0
  with a notice if the secret is absent (no production DB until Plan 4).
- [ ] Tests: WB fixture with 2 pages → all years, nulls skipped; WB error payload
  (`[{"message":[...]}]`) → throws with the message; IMF fixture with many countries → only GHA;
  2031 → `projected` with today 2026-11-10, 2025 → `reported`; FPP 2024 → `reported`.
- [ ] RED → implement → GREEN → commit `feat(ingest): World Bank and IMF adapters, CLI and weekly schedule`

### Task 5: Shared chart geometry (`apps/web/lib`)

**Files:** `apps/web/lib/chart.ts` (+ test).

**Interfaces — Consumes:** `ribbonSegments` (redesign), `IndicatorSeries` (Task 2).
**Produces:** `buildChartModel(series, administrations, events, today) → { years: string[]; actual: (number|null)[]; projected: (number|null)[]; bands: { from: string; to: string; name: string; kind; tone: 'a'|'b' }[]; events: { year: string; title: string }[]; sparse: boolean }`
- `sparse` = fewer than half the years in the span have values (→ points, no line).
- [ ] Tests: years span first..last point; missing years null; projected only in `projected`;
  bands clipped to the series span and alternate tone by position; poverty-like series → `sparse`.
- [ ] RED → implement → GREEN → commit `feat(web): chart model with administration bands and events`

### Task 6: Indicator pages

**Files:** `app/history/indicators/page.tsx`, `app/history/indicators/[code]/page.tsx`,
`components/IndicatorChart.tsx` ('use client', dynamic `import('echarts/core')` with Line/Scatter,
MarkArea, MarkLine, Tooltip, Grid, SVGRenderer), `components/SeriesTable.tsx`, e2e spec.
- Index page: indicators grouped by sector, each with name, unit, years covered, a tiny inline
  sparkline (server-rendered SVG, no ECharts).
- Indicator page: title, plain definition, chart (bands + events + actual line/points + dashed
  projection), "How to read this" note, source panel with release (vintage) selector as links
  (`?vintage=`), methodology note, table alternative (`<details>` on mobile), CSV link.
- History landing: "Historical indicators" becomes live; home "national indicators" entry live.
- [ ] Tests: SeriesTable renders "Not available" for null and marks modelled/projected rows;
  e2e (fixture-imported DB): `/history/indicators` lists 17; inflation page shows a chart
  container, a table with a 2016 row, a "Not available" cell where expected, 19 administration
  bands' worth of labels in the accessible description; `?vintage=` of an unknown date → latest.
- [ ] RED → implement → GREEN → screenshot review (desktop/mobile, light/dark) → commit
  `feat(web): indicator pages with administration bands, table and sources`

### Task 7: Public API v1

**Files:** `app/api/v1/indicators/route.ts`, `app/api/v1/indicators/[code]/route.ts`,
`app/api/v1/indicators/[code]/observations.csv/route.ts`, `lib/csv.ts` (+ test), e2e.
- JSON: `{ data, meta: { source, vintage, licence, generatedAt } }`; 404 `{ error: 'Unknown indicator' }`.
- CSV columns: `indicator,year,value,estimate_type,source,vintage`; empty cell for null;
  `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
- [ ] Tests: `toCsv` escapes quotes/commas/newlines and prefixes `= + - @`; e2e: list endpoint
  returns 17; unknown → 404; CSV header row exact.
- [ ] RED → implement → GREEN → commit `feat(web): public read-only indicators API and CSV`

## Done when

`pnpm check && pnpm build && pnpm e2e` green in CI; `pnpm ingest` (live) imports all 17 locally;
Codex review addressed; issue #6 closed by the PR.
