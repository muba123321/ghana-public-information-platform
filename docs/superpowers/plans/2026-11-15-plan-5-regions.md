# Plan 5 · Regions & the 3D map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Ghana's 16 regions as sourced records:
- regional figures that stay honest across the 2019 split;
- farm products and heritage sites;
- commitments tagged by region;
- a page for each region;
- the owner-approved 3D map, "A1 toned down", as the front page's main visual.

**Architecture:**
- `packages/db` gets region tables and seed data files reviewed in pull requests.
- `packages/ingest` gets one new importer (DHS Program API) and a build script that turns the region outlines and water into one static ~60 KB JSON.
- `apps/web` gets a `features/regions` slice:
  - a client `RegionsMap` (layered SVG in CSS 3D, no WebGL, no new dependency);
  - a region page;
  - server queries.
- The commitments feature gains region tagging.

**Tech Stack:** TypeScript 5.9, Next.js 16, Drizzle/PGlite, Vitest, Playwright. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-15-compare-regions-launch-design.md`, Part 2, including the "builder check; my call" decisions. Reference mockup: `docs/superpowers/specs/assets/2026-11-15-regions-map-mockup.html`; its look is the target.

## Global Constraints

- **Every figure, product and place has a source** (`source_id NOT NULL`).
- **Missing values** are `null` and display as "Not available".
- **Colour:** regions are coloured only by north→south position, with a key that says so. No party colours, no heat-map meaning.
- **No ranking,** and no per-government figures on region pages.
- **Former-region figures are labelled.** On a successor region's page, pre-2019 figures carry their geography: "figure for the former Northern Region". Figures measured for the region itself say so. Charts mark the 2019 split.
- **Regions:** 20 rows in all.
  - 16 current regions.
  - 4 former ones: `northern-former`, `brong-ahafo`, `volta-former`, `western-former`, valid until 2019.
  - The split, effective 2019, recorded with its constitutional instrument as the source:
    - Northern → Northern, Savannah, North East;
    - Brong-Ahafo → Bono, Bono East, Ahafo;
    - Volta → Volta, Oti;
    - Western → Western, Western North.
- **Licences and credit line:** geoBoundaries ADM1 (stated as CC BY-SA 2.0; OSM-derived, so it carries ODbL) and Natural Earth (public domain). The site's credit line: "Boundaries: geoBoundaries (CC BY-SA 2.0), © OpenStreetMap contributors (ODbL). Water: Natural Earth."
- **Map: no new dependency, no WebGL.**
  - The script is under 40 KB gzipped and loads only on the front page.
  - `prefers-reduced-motion` stops all motion.
  - Every region is a keyboard-focusable link, and there is a text list alternative.
- **Hover card label:** "Commitments recorded", never "projects". Nationwide commitments are not counted.
- **Rules carried over:** `AGENTS.md` structure rules (enforced by `architecture.test.ts`), TDD, `pnpm check` and `pnpm e2e` green, exact versions, conventional commits with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A successor region's history.**
   - Savannah's population chart shows 2000 and 2010 as "former Northern Region" figures, 2021 as its own, and a split marker at 2019.
   - Nothing is shown twice as if it were its own figure.
   - Covered in Tasks 2 and 6.
2. **A region with no figure for a hover-card field** shows "Not available", never 0 or a blank. Covered in Task 7.
3. **Keyboard and screen-reader users.**
   - Tab reaches every region in north→south order.
   - Enter opens its page.
   - The text list under the map gives the same figures.
   - Covered in Task 7 (e2e).
4. **Reduced motion, and phones at 360 px.** No animation runs; no sideways scroll; tapping a region shows the card, and tapping again opens the page. Covered in Task 7 (e2e with `reducedMotion: 'reduce'`).
5. **A commitment tagged with a former region** (Brong-Ahafo) appears on Bono, Bono East and Ahafo under "Named for the former Brong-Ahafo Region", and doesn't count in their own "Commitments recorded". Covered in Task 5.

---

### Task 1: Regions, lineage and regional indicators (schema + seed)

**Files:**
- Create: `packages/db/src/schema/regions.ts`, plus a migration generated with `pnpm db:generate`.
- Create seed data files in `packages/db/src/seed/data/`: `regions.ts`, `region-lineage.ts`.
- Modify:
  - `packages/db/src/schema/indicators.ts`: add `scope` (`national` | `regional`, default `national`);
  - `packages/db/src/seed/data/indicators.ts`: add the regional indicators;
  - `packages/db/src/seed/seed.ts` and `sync.ts`;
  - `packages/core/src/schemas.ts`: add `RegionSeedSchema`.
- Create: `packages/db/src/repositories/regions.ts` (+ test).

**Interfaces:**
- **Tables:**
  - `regions(slug pk, name, capital, valid_from, valid_to null, editorial columns, source_id)`;
  - `region_lineage(from_slug, to_slug, kind 'split_into', effective_on, source_id)`;
  - `region_observations(id, indicator_code, region_slug → regions, measured_for_region_slug → regions, period_start, period_end, value numeric null, estimate_type, source_id, vintage)`. Unique on `(indicator_code, measured_for_region_slug, period_start, source_id, vintage)`.
- **Regional indicators**, each `scope: 'regional'`, in sectors that already exist:
  - `population-census` (persons; GSS census);
  - `poverty-national-line` (% of people below Ghana's national poverty line; GSS GLSS);
  - `skilled-birth-attendance` (% of births; DHS);
  - `child-basic-vaccination` (% of children 12–23 months; DHS);
  - `households-electricity` (% of households; DHS);
  - `households-improved-water` (% of households; DHS).
- **Produces:**
  - `listRegions(db, { current?: boolean }): Promise<RegionSummary[]>`, in north→south order using a seeded `display_order`;
  - `getRegion(db, slug): Promise<RegionDetail | null>`, which includes `formerParents: { slug; name; until }[]`;
  - `regionSeries(db, slug, code): Promise<{ year; value; measuredFor: { slug; name; former: boolean } }[]>`. It returns the region's own figures plus its former parents' figures for periods before it existed. Each value carries its geography; nothing is merged.
  - `listIndicators` returns national indicators only, so the existing pages are unchanged.

- [ ] **Step 1: Failing tests** in `regions.test.ts`:
  - `'seeds 16 current and 4 former regions'`;
  - `'records each 2019 split with its source'`: 10 lineage rows;
  - `'a successor region gets its own figures and its former parent's earlier figures, each labelled'`. Seed: Northern-former 2010 = 2.48 m, Savannah 2021 = 0.65 m. `regionSeries('savannah','population-census')` gives `[{year:2010, value:2479461, measuredFor:{slug:'northern-former', former:true}}, {year:2021, value:653266, measuredFor:{slug:'savannah', former:false}}]`.
  - `'a parent figure after the split is never shown for a successor'`.
  - `'national indicator lists are unchanged'`: `listIndicators` returns no `regional` scope.
- [ ] **Step 2:** Run `pnpm --filter @gpip/db test`. Expected: FAIL.
- [ ] **Step 3: Implement the schema, migration, seed and repository.**
  - Regions' names, capitals, order and dates come from the 2019 instruments. Cite the C.I.s and the Electoral Commission referendum results as sources.
  - Add `scope` filtering to `listIndicators`.
- [ ] **Step 4:** Run `pnpm check`. Expected: green.
- [ ] **Step 5: Commit** (`feat(db): regions, lineage and regional indicators`).

### Task 2: Regional figures — DHS importer and GSS data files

**Files:**
- Create: `packages/ingest/src/adapters/dhs.ts` (+ `dhs.test.ts`), with recorded fixtures in `packages/ingest/fixtures/dhs/`.
- Modify: `packages/ingest/src/pipeline.ts` (regional pipeline step) and `cli.ts` (`--regional`).
- Create GSS data files in `packages/db/src/seed/data/`:
  - `region-population.ts`: censuses 2000, 2010 (10 regions) and 2021 (16 regions);
  - `region-poverty.ts`: GLSS 6 2012/13 and GLSS 7 2016/17, by the 10 former-era regions.

  Every row carries `source` and `page`.

**Interfaces:**
- **Consumes:** `region_observations` and `regions` (Task 1).
- **DHS adapter:**
  - `fetchDhsRegional(indicatorIds: string[], fetchImpl): Promise<{ indicatorId; surveyYear; regionLabel; value }[]>`, using `https://api.dhsprogram.com/rest/dhs/data?countryIds=GH&indicatorIds=…&breakdown=subnational&f=json`.
  - `mapDhsRegion(label, surveyYear): string | null` maps DHS region labels to our slugs. Surveys before 2019 map to the former regions (e.g. "Brong Ahafo" → `brong-ahafo`, "Northern" in 2014 → `northern-former`); the 2022 survey maps to the 16. An unknown label gives `null` and is logged as an error, never guessed.
- **DHS ids:**
  - `RH_DELA_C_SKP` → `skilled-birth-attendance`;
  - `CH_VACC_C_BAS` → `child-basic-vaccination`;
  - `HC_ELEC_H_ELC` → `households-electricity`;
  - `WS_SRCE_H_IMP` → `households-improved-water`.

- [ ] **Step 1: Failing tests:**
  - `'maps every region label in the recorded 2014 and 2022 surveys'`. The fixtures are recorded once from the live API; if the API is unreachable, write them from its documented response shape and say so in the ledger.
  - `'a pre-2019 survey figure is stored for the former region'`.
  - `'an unknown region label is an error, not a guess'`.
  - `'GSS files: every row has a source and page; 2021 has 16 regions, 2010 has 10'`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** The importer writes `region_observations` with `measured_for_region_slug` set to the survey's own geography.
- [ ] **Step 4:** Run `pnpm check`, then `pnpm ingest --regional --fixtures`. Expected: rows imported, 0 errors.
- [ ] **Step 5: Commit** (`feat(ingest): regional figures from DHS and GSS`).

### Task 3: Map geometry build

**Files:**
- Create: `packages/ingest/src/geo/build-map.ts` (+ test).
- Create the raw inputs, committed with a README stating sources and licences, in `packages/ingest/geo/`:
  - `geoBoundaries-GHA-ADM1_simplified.geojson`;
  - `ne_10m_lakes.gha.geojson` and `ne_10m_rivers.gha.geojson`, pre-clipped to Ghana.
- Output: `apps/web/src/features/regions/map-data.json`.

**Interfaces:**
- **Produces** `map-data.json`:
  ```
  { w, h, proj, regions: [{ slug, name, d, cx, cy, anchor: [x,y] }],
    lakes: [{ name, d }], rivers: [{ name, d }], coast: d, credit }
  ```
  - Projection: equirectangular with cos-latitude scaling, then Douglas–Peucker with a tolerance of 0.6 px. Rings are split in half before simplifying, which the mockup's script showed is needed.
  - `anchor` is the region's pole of inaccessibility, where figures stand.
  - Region names are mapped to our slugs; unmapped names fail the build.
  - Lake Bosomtwe is added as an ellipse at 6.505°N, 1.41°W.

- [ ] **Step 1: Failing tests:**
  - `'produces 16 regions mapped to our slugs'`;
  - `'every anchor lies inside its region'` (point-in-polygon check);
  - `'output is under 70 KB'`;
  - `'includes Lake Volta, Lake Bosomtwe and the Black Volta, White Volta, Oti and Volta rivers'`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** `build-map.ts` and the `pnpm --filter @gpip/ingest build-map` script. Commit the generated JSON.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** (`feat(ingest): Ghana map geometry with water`).

### Task 4: Places and farm products (curated, sourced)

**Files:**
- Modify: `packages/db/src/schema/regions.ts`, adding:
  - `places(slug, name, kind, region_slug, lat, lon, about, unesco, source_id, photo_url null, photo_licence null)`;
  - `region_products(region_slug, product, kind 'crop'|'livestock'|'fishing', rank 'main'|'notable', source_id, year)`.
- Create seed data files: `places.ts` (the mockup's 21 sites) and `region-products.ts`.
- Create: `packages/db/src/repositories/places.ts` (+ test).

**Interfaces:**
- **Produces:**
  - `listPlaces(db, { region? })`;
  - `listRegionProducts(db, { region? })`.
- **Place kinds:** `castle | mosque | waterfall | forest | hills | palace | stilt_village | dam | memorial | wildlife | lake`. Wildlife places carry an `animal` field (`elephant | hippo | crocodile`).
- **Sources:**
  - UNESCO World Heritage List entries 34 (Forts and Castles) and 35 (Asante Traditional Buildings);
  - Ghana Tourism Authority pages for the other sites;
  - MoFA *Agriculture in Ghana: Facts and Figures* (2019 edition) and the GSS 2017/18 Census of Agriculture for products.

  Each `about` is one factual sentence with no promotional words. A test greps for "best", "must-see", "stunning", "amazing" and "beautiful".

- [ ] **Step 1: Failing tests:**
  - `'every place has a source and lies inside its region'` (uses Task 3's polygons);
  - `'exactly the three UNESCO sites are marked'` (Cape Coast Castle, Elmina Castle, Asante Traditional Buildings);
  - `'descriptions use no promotional words'`;
  - `'every current region has at least one main product'`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** the schema, seed and repositories.
- [ ] **Step 4:** Run `pnpm check`. Expected: green.
- [ ] **Step 5: Commit** (`feat(db): places and farm products by region`).

### Task 5: Commitments by region

**Files:**
- Modify:
  - `packages/db/src/schema/commitments.ts`: add `commitment_regions(commitment_slug, region_slug → regions)` and `commitments.nationwide boolean default false`;
  - `repositories/review.ts`: `CommitmentEdit.regions: string[]` and `nationwide: boolean`;
  - `repositories/commitments.ts`: `listCommitmentsForRegion(db, slug)`;
  - `packages/core/src/schemas.ts`: `ExtractedCommitmentSchema` gains `places: string[]`, the place names exactly as printed;
  - the extraction prompt;
  - `apps/web/src/features/review/components/ReviewForm.tsx`: a region multi-select listing current and former regions, labelled "(former)", plus a "Nationwide" checkbox;
  - the review admin action.

**Interfaces:**
- **Produces:** `listCommitmentsForRegion(db, slug): Promise<{ own: CommitmentSummary[]; fromFormer: { region: { slug; name }; items: CommitmentSummary[] }[] }>`. Published only. `own` excludes nationwide commitments.

- [ ] **Step 1: Failing tests:**
  - `'tags are confirmed by the editor on approval'`;
  - `'a Brong-Ahafo commitment shows on Bono, Bono East and Ahafo under its former region, not in their own list'`;
  - `'nationwide commitments are in no region's list'`;
  - `'drafts are never listed'`;
  - one e2e step in `admin.spec.ts`: the editor ticks Ahafo, approves, and the commitment appears on `/regions/ahafo`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `pnpm check` and the e2e suite. Expected: green.
- [ ] **Step 5: Commit** (`feat: commitments tagged by region`).

### Task 6: Region page `/regions/[slug]` and the regions list

**Files:**
- Create in `apps/web/src/features/regions/`:
  - `server/queries.ts`: `loadRegions`, `loadRegion` and `loadRegionCard`;
  - `components/RegionProfile.tsx` (+ `.module.css`);
  - `components/RegionFigureChart.tsx` (client, ECharts): survey points, a split marker, and former-region points drawn hollow with a legend;
  - `labels.ts`;
  - `index.ts`.
- Create the routes `app/(public)/regions/page.tsx` (list) and `app/(public)/regions/[slug]/page.tsx`, and `e2e/regions.spec.ts`.
- Modify: the site header (add a "Regions" link) and `ModuleOverview`.

**What the region page shows:**
- A header with name, capital, and "Created 2019 from the former Northern Region" where it applies.
- Figures over survey years: one chart and table per regional indicator, with government bands shaded as on the indicator pages, and no per-government numbers.
- Commitments: the region's own, then "Named for the former … Region".
- Places to visit.
- Main farm products.
- Sources.
- A "Report an error" link.

- [ ] **Step 1: Failing e2e tests:**
  - `'a successor region labels figures from its former region'`: `/regions/savannah` shows "figure for the former Northern Region" and the text "Region created 2019".
  - `'an original region has no former-region labels'`: `/regions/ashanti`.
  - `'missing figures say Not available'`.
  - `'the regions list is in north to south order with a text alternative to the map'`.
- [ ] **Step 2:** Run them. Expected: FAIL (404).
- [ ] **Step 3: Implement.** The page stays thin; the profile component owns the markup.
- [ ] **Step 4:** Run `pnpm check` and `pnpm turbo run e2e --force`. Expected: green.
- [ ] **Step 5: Commit** (`feat(web): region pages`).

### Task 7: The 3D front-page map

**Files:**
- Create in `apps/web/src/features/regions/components/`:
  - `RegionsMap.tsx`: client; layers; hover card; keyboard; reduced motion; phone tap;
  - `RegionCard.tsx`;
  - `MapLayers.tsx`;
  - `icons/`: one `PascalCase.tsx` per landmark and animal kind, as SVG in the mockup's style, plus `CropIcon.tsx`.

  Each has a `.module.css`.
- Modify: `features/overview/components/HomeView.tsx`. The map goes inside the hero under the title, and the ribbon moves to the next section.
- Create: `e2e/map.spec.ts`.

**Interfaces:**
- **Consumes:** `map-data.json` (Task 3), `loadRegionCard` (Task 6), `listPlaces` and `listRegionProducts` (Task 4).
- **Produces:** `<RegionsMap regions={RegionCardData[]} places={…} products={…} />`. `RegionCardData` is:
  ```
  { slug, name, latestPopulation: {year, value, measuredFor}|null,
    poverty: {points, measuredFor}, skilledBirths: {...}|null,
    commitments: { own: number; former: number }, places: number,
    products: string[] }
  ```

**Behaviour, matching the approved mockup:**
- **Scene:**
  - tilt `rotateX(50deg) rotateZ(-10deg)`, scale to container;
  - deep night-blue stage, grid floor;
  - muted ramp `#c7a764 #bf9466 #b48585 #9d84a6 #8189ad #6f9aa5 #6f9e91 #88a487`, north→south;
  - the sea, and water clipped into each region.
- **Hover a region:**
  - it lifts `translateZ(60px)`, the others dim, and a beam shows;
  - a glass card appears with counters (500 ms count-up), the poverty sparkline, products chips, and "Click to open the full regional record".
- **Layers:**
  - tabs `Everything · Farming & animals · Heritage & tourism · Regions only`;
  - standing sprites counter-rotate `rotateZ(10deg) rotateX(-50deg)`;
  - motion types walk, swim, sway and bob.
- **Keyboard:** each region is an `<a href="/regions/slug">` with `aria-label="{name}: {summary}"`. Arrow keys move north/south. Focus behaves like hover.
- **Phones (≤ 640 px):**
  - tilt 35°, smaller sprites;
  - the first tap shows the card, the second opens the page;
  - the tabs become a scrollable chip row.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, all animations and transitions are off.
- **No 3D support:** if `CSS.supports('transform-style','preserve-3d')` is false, the same SVG is drawn flat.
- **Text alternative:** under the map, a "Regions" list of links with each region's card figures as text.
- **Credit line:** in the map footer, from `map-data.json`.

- [ ] **Step 1: Failing e2e tests** in `map.spec.ts`:
  - `'every region is a link with its figures in its name'`: 16 links in the map group;
  - `'hovering a region shows its card with Not available for missing figures'`;
  - `'layer tabs show and hide farming and heritage figures'`;
  - `'keyboard: Tab reaches the regions and Enter opens a region page'`;
  - `'reduced motion: no running animations'`: `document.getAnimations().length === 0` with reduced motion;
  - `'phone: first tap shows the card, second tap opens the page, no sideways scroll at 360 px'`;
  - `'the credit line names geoBoundaries, OpenStreetMap and Natural Earth'`.

  Also a unit test for any pure helper, such as card text formatting.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement**, porting the mockup's approach into typed components with CSS modules and no inline style rules beyond `cssVars`. Check the client bundle with `next build` output: the map chunk must be under 40 KB gzipped.
- [ ] **Step 4:** Run `pnpm check` and `pnpm turbo run e2e --force`. Screenshot desktop and phone in light and dark, and compare against `assets/2026-11-15-regions-map-direction.png`.
- [ ] **Step 5: Commit** (`feat(web): 3D regions map on the front page`).

### Task 8: Review and PR

- [ ] **Step 1:** Run `pnpm check && pnpm build && pnpm turbo run e2e --force`. Expected: all green.
- [ ] **Step 2:** Run `codex review --base main` and one fresh whole-branch review on the most capable model, against this plan's Review Focus. Fix findings test-first.
- [ ] **Step 3:** Open the PR "Plan 5: Regions and the 3D map", part of epic #8, and add it to project board 1. After merging, the owner runs `pnpm db:migrate && pnpm db:seed && pnpm ingest --regional`.
