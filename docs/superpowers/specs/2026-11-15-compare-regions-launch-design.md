# Compare, Regions map and Launch — design

Date: 2026-11-15 · Status: for owner approval · Builds on
`2026-11-09-gpip-government-performance-design.md` (the main spec) and `AGENTS.md`.

## Why

GPIP already shows what each government promised and how national figures moved. Before it goes
public, the owner wants three more things:

1. **Compare.** A fair way to put governments side by side. This is roadmap Plan 4 and spec §6
   area 5.
2. **An engaging front page.** A 3D map of Ghana's 16 regions. Hovering a region shows its figures
   over the years. Clicking opens the region's own record: its figures, the government projects
   carried out there, its farming, and its heritage and tourist sites.
3. **Going live.** Production hosting, real content, and the checks a public, credibility-first
   site needs.

The audience is unchanged: ordinary Ghanaian citizens, journalists and investors. The neutrality
rules in `AGENTS.md` apply to everything here: no scores, every figure sourced, gaps shown as
gaps, no party colours.

## Work split and order (owner agreed: Compare, then map, then launch)

| Plan | Delivers | Depends on |
|---|---|---|
| **4 · Compare** | tenure summaries in `core`, the Compare page, indicators on every government profile, the methodology page | data already imported |
| **5 · Regions & map** | regional data model and importers, the 3D front-page map with its layers, region pages, commitments tagged by region | nothing from Plan 4; it is built after it only because of the agreed order |
| **6 · Launch** | pilot commitments, production deploy, accessibility and speed audit, lawyer-review pack | Plans 4 and 5 |

Each plan has its own PR, and each must merge before the next plan is written (owner rule).

## Goals, non-goals, anti-goals

**Goals**
- A visitor can compare 2–4 governments, or presidents, across one topic, with the inherited
  starting point visible.
- The front page invites exploration by region. Every number the map shows is sourced and opens
  to its source.
- A region's history stays honest across the 2019 split from 10 to 16 regions.
- The site can launch on production hosting with real, editor-reviewed commitments.

**Non-goals**
- District-level data. Only regions, for now.
- Election results, or anything party-coded, on the map.
- Live satellite or street maps and base-map tiles.
- New national indicators beyond the 16 already imported.

**Anti-goals** (failure even if it "works")
- Any single headline number or ranking per government or region (spec §11.8).
- Map colours that read as a judgement (a "better/worse" heat map) or that resemble party colours.
- A front page that is slow or unusable on a mid-range Android phone.
- Regional figures shown without saying which geography they were measured for.

---

## Part 1 · Compare (Plan 4)

### Rules in `packages/core`
`tenureSummary(points, tenure, all tenures, today)` returns, for one indicator and one tenure:
- `baseline`: the inherited value. This is the last complete period ending before the start
  (existing `inheritedBaseline`).
- `end`: the value of the last associated period *that has one*, always labelled with its year
  (e.g. "2024: 23.1%"). The sitting government's unfinished year has no figure yet, so its `end`
  is the latest year with a figure. Coverage shows the missing years *(builder check; my call)*.
- `average`: the mean of the associated periods.
- `change`: end minus baseline, in the indicator's own unit. A percent indicator gets
  percentage points; it is never a percent of a percent.
- `coverage`: the number of associated periods that have a value, out of the total. When coverage
  is below half, the result is flagged `sparse`.

A period is "associated" with a tenure using the existing `associate` rule: majority of the period
in office, with handover periods flagged as transition. Missing values stay `null`. The function
never fills gaps. Projections (`estimate_type = projected`) are excluded; modelled values are
included but flagged. The formulas are defined once here and quoted on the methodology page.

### The Compare page
URL: `/history/compare?a=<slug>&b=<slug>[&c=&d=]&by=term|person&topic=<sector>`. It is a stable
permalink.

```
Compare governments                                         [ by term | by person ]
[ Kufuor I ▾ ] [ Kufuor II ▾ ] [ + add ]   Topic: [ Economy ▾ ]

Inflation (% a year)            ← one small chart per indicator in the topic
  │  each tenure's line starts at its baseline (hollow dot "inherited")
  │  and ends at its last value (labelled "2008: 16.5%")
  │  x-axis: years in office 0,1,2,3… (toggle: calendar years)
  ▸ Show the figures            → table: baseline · end · average · change · coverage
  Context in these years: dated events from context_events (e.g. 2007 redenomination)
"Being in office is not the same as causing a change." (always visible)
```

- **Choosing governments:** 2 to 4 from all 19, listed in date order only.
- **By person** *(builder check; my call)*:
  - **Who counts:** the person who led the government. That is the head of government where the
    record has one; otherwise it is the head of state. So Nkrumah for 1957–60, Busia for 1969–72,
    and the president or military head elsewhere.
  - **Dates:** a person's stretch in office uses their leader-record dates, not the whole
    administration's. Mahama starts on 24 Jul 2012; Afrifa takes over the NLC from Ankrah;
    Acheampong runs across NRC and SMC I as one stretch.
  - **Separate stretches stay separate.** Rawlings 1979 and 1981–2001, or Mahama 2012–17 and
    2025–, each get their own baseline and their own line, labelled with their years. The table
    has one row per stretch. There is no combined average across stretches.
- **Topics:** the sectors of the existing 16 indicators. Within a topic, every indicator is shown
  for every chosen government, so each gets the same set (spec §7).
- **Lines:** one tone per selected government by position (tone a/b/c/d), never by party.
- **Missing data:** an indicator with no values in a tenure shows "Not available" for it.
- **Notes shown when relevant:** methodology breaks and population change. Per-capita or % of GDP
  views appear only where an imported indicator already gives them; nothing is computed fresh.
- **Downloads and access:** CSV download of the table, and `/api/v1/compare` returning the same
  data as JSON.

### Government profiles (unchanged by person mode)
Each `/history/administrations/[slug]` page gains an "Indicators in this term" section. It shows
the same indicator set for every government, using the `tenureSummary` table with a sparkline per
indicator. This replaces today's line "indicators are on each indicator page".

### Methodology page
`/methodology` explains, in plain English, with each rule linked from where it is used:
- how periods are associated with governments, and how transitions are handled;
- the inherited baseline;
- average and change;
- coverage;
- modelled values versus projections;
- why there are no scores;
- the delayed-effect caveat.

The page is linked from Compare, from every chart's "how to read this", and from the footer.

---

## Part 2 · Regions & the 3D map (Plan 5)

### Approved look (owner, via mockups)
Direction **A1, toned down**:
- A tilted 3D map on a deep night-blue stage with a faint grid floor.
- Muted earth-tone regions: sand, clay, dusty rose, lavender-grey, slate, sage. Colour is assigned
  only by north-to-south position, and a key says so.
- Water drawn in: Lake Volta, Lake Bosomtwe, the Black Volta, White Volta, Oti and Volta rivers
  with a slow flow shimmer, and the sea along the coast with gentle waves.
- Hovering a region raises it, dims the others, shows a soft light beam, and opens a glass card
  with counters and a small chart.
- Layer switcher: **Everything · Farming & animals · Heritage & tourism · Regions only**.
- **Farming & animals:** small animated figures stand where each product or animal is mainly
  found. Cattle and goats walk, fish swim, crops sway or bob.
- **Heritage & tourism:** small illustrated landmarks, not pins. Castles, mosque, waterfalls,
  forests, hills, palace, stilt village, dam, memorial, elephant, hippo, crocodile and canoe. A
  thin gold ring marks UNESCO World Heritage sites.

Reference: `assets/2026-11-15-regions-map-direction.png` and the interactive
`assets/2026-11-15-regions-map-mockup.html`. The mockup's figures are invented. In the product,
every figure and list is sourced.

### Approaches considered (rendering)
- **A · Layered SVG in CSS 3D** ✅ *(my call)*. This is how the mockup works.
  - Each region is an SVG layer in a CSS `preserve-3d` scene. No WebGL and no new library.
  - About 60 KB of geometry. Fast on phones.
  - Regions stay real, focusable SVG elements, so keyboard and screen-reader access is natural.
- **B · WebGL** (three.js, deck.gl or ECharts-GL). True 3D lighting, but it adds 300–700 KB and
  needs a separate accessible layer. Rejected: the approved look doesn't need it.
- **C · MapLibre with 3D extrusions over base-map tiles.** Real terrain and roads, but it needs
  tile hosting and tile licences, and street detail isn't wanted. Rejected.

### Regional data model (`packages/db`)
- **`regions`:** one row per region that ever existed, with `valid_from` / `valid_to`. That makes
  20 rows *(builder check; my call)*:
  - the 16 current regions;
  - 4 former regions (Northern, Brong-Ahafo, Volta and Western as they were before 2019).

  The 2019 split turned those 4 into 10 current regions:
  - Northern → Northern, Savannah, North East;
  - Brong-Ahafo → Bono, Bono East, Ahafo;
  - Volta → Volta, Oti;
  - Western → Western, Western North.

  The current Northern, Volta and Western are smaller than the old regions of the same name. So
  their pre-2019 figures carry the "former … Region" label too. The other 6 regions (Ashanti,
  Central, Eastern, Greater Accra, Upper East, Upper West) were not split and have one record each.
- **`region_lineage`:** records how a current region came from a former one (`split_from`, with a
  date and a source, C.I./E.I. 2019), as `institution_lineage` already does for ministries.
- **Regional indicators** *(builder check; my call)*:
  - They live in the existing `indicators` catalogue, with a new `scope` column (`national` |
    `regional`).
  - Regional-only indicators (skilled births, vaccination, school attendance, literacy) don't
    appear on the national indicator pages.
  - A measure gets its own code whenever its definition differs from the national series. For
    example, GLSS poverty at Ghana's national poverty line is `poverty-national-line`, not the
    World Bank's `poverty` ($3.00 a day).
  - This is not a new national indicator, so the non-goal stands.
- **`region_observations`:** indicator, `region_slug` (the region the page is about),
  `measured_for_region_slug` (the geography the figure actually describes), period, value,
  `estimate_type`, source and vintage. Every row is sourced and missing values are never zero.
- **Owner rule (approach A, extended).**
  - **Older figures.** On a new region's page, figures from before it existed come from its former
    parent. They are always labelled, e.g. "2014 · figure for the former Northern Region".
  - **New figures.** When figures measured for the new region itself arrive in later imports, they
    are recorded with `measured_for_region_slug` = the region itself and labelled as such.
  - **Charts.** Charts mark the split ("Region created 2019 — earlier points are for the former
    Northern Region").
  - **Both geographies.** When both a parent figure and an own figure exist for one survey, both
    are kept and shown, labelled. Neither silently replaces the other.

### Regional sources (importers in `packages/ingest`, with recorded fixtures)

| Source | What | Years |
|---|---|---|
| DHS Program API (indicator data, public) | skilled birth attendance, child vaccination, school attendance, electricity and water access by region | 1988, 1993, 1998, 2003, 2008, 2014, 2022 |
| Ghana Statistical Service census tables | population, literacy, household electricity, piped water | 2000, 2010, 2021 |
| GLSS reports (GSS) | poverty rate by region | 1991/92 → 2016/17 rounds |

- Survey years are shown as points, not joined lines, as with poverty today.
- Each importer pins the source's licence and URL, as the World Bank and IMF adapters do.
- GSS tables that arrive as PDFs or spreadsheets are archived and entered through the review
  queue. They are never published unreviewed.

### Geography
- **Region outlines:** geoBoundaries gbOpen GHA ADM1, 2021. geoBoundaries' metadata states its
  licence as CC BY-SA 2.0, with OpenStreetMap as the source; OpenStreetMap's own licence is ODbL
  *(builder check; my call)*.
  - The site credits both: "Boundaries: geoBoundaries (CC BY-SA 2.0), © OpenStreetMap
    contributors (ODbL)".
  - The simplified geometry is published under ODbL, the stricter terms.
  - The question goes into the lawyer-review pack.
  - Fallback if counsel prefers: OCHA's Ghana administrative boundaries (COD-AB), checking their
    licence first.
- **Water:** Natural Earth 10 m lakes and rivers (public domain). Lake Bosomtwe is added by its
  coordinates.
- **Build step:** projected and simplified at build time by a script in `packages/ingest`. The
  output is a static JSON of about 60 KB. The browser never fetches raw GeoJSON.

### Farming & animals, and Heritage & tourism (curated, sourced records)
- **`region_products`:** product or animal, region, `rank` (main or notable), source, year.
  - Sources: the Ministry of Food and Agriculture's *Agriculture in Ghana: Facts and Figures*, and
    the GSS 2017/18 Ghana Census of Agriculture.
  - On-map positions: one figure per product per main region, placed at that region's interior
    anchor point. Motion is chosen by type (walk, swim, sway, bob).
- **`places`:** name, kind (castle, mosque, waterfall, forest, hills, palace, stilt village, dam,
  memorial, wildlife), region, latitude and longitude, a one-line description, `unesco`, source,
  and an optional photo with its licence.
  - Sources: the UNESCO World Heritage List, the Ghana Tourism Authority, and the Ghana Museums
    and Monuments Board.
  - The first list is the 21 sites in the mockup.
- **How they get in** *(builder check; my call)*:
  - Places, products and any regional figures typed in from GSS PDF tables arrive as data files
    in `packages/db/src/seed/data/`. Each row cites its source and page.
  - They are reviewed in the pull request, and the owner's merge is the editor's approval.
    `provenance` is `manual` and `reviewed_by` is the owner.
  - Changes to published rows still go to the public change log.
  - Admin screens for editing these come later, if the lists start changing often.
  - Descriptions are factual, with no promotional or evaluative words.
- Icons are one custom SVG set drawn in the mockup's style, not emoji, so every phone shows the
  same thing.

### Front page
The map becomes the front page's main visual, placed directly under the title, inside today's
hero. The governments ribbon moves below it, in the next section, and keeps its links.

The hover card shows:
- the latest population;
- the latest poverty rate, with a survey-year sparkline;
- skilled births;
- the number of commitments recorded;
- the number of places to visit;
- the main products.

Each figure carries its year. Unknown figures show "Not available".

### Region page `/regions/[slug]`
- The figures over survey years, with the former-region labelling and the split marker.
- **Commitments in this region.** These are commitments tagged with the region, plus those
  named for its former parent, shown as a separate group. The page says "in office during", never
  "delivered by".
- **No breakdown by government** *(builder check; my call)*. Region charts shade the governments
  in office, as the indicator charts do, but there are no per-government figures or tables, so
  nothing implies a regional ranking of governments. Plan 5 therefore doesn't depend on
  `tenureSummary`.
- Places to visit.
- Main farm products.
- Sources.
- The same "report an error" link as everywhere else.

### Commitments by region
- **Data:** a new `commitment_regions` table (`commitment_slug`, `region_slug`), plus a
  `nationwide` flag on commitments. `region_slug` may name a former region too, because older
  documents name Brong-Ahafo, for example. Editors tag the region the document names
  *(builder check; my call)*.
- **Successor pages:** each successor region's page lists those commitments in their own group,
  headed "Named for the former Brong-Ahafo Region".
- **The hover-card count:**
  - It is labelled **"Commitments recorded"**, not "projects", because most items are promises.
  - It counts commitments tagged with the region itself, of every kind.
  - Commitments for the former parent appear as "+N for the former region".
  - Nationwide commitments are not counted.
- **Extraction:** the extraction schema and prompt ask for any place named in the wording.
- **Review:** the review form gets a region multi-select, with a "Nationwide" option.
- **Before publishing:** editors confirm regions like any other field.
- **Existing records:** commitments published earlier, and the pilot set, are tagged during
  review.

### Phones, motion and accessibility
- `prefers-reduced-motion` turns off the float, scan, flow, walk and bob motion. Hover still
  works, without animation.
- **Phones:**
  - shallower tilt, smaller figures;
  - tapping a region shows its card, and tapping again opens the page;
  - the layer switcher becomes a scrollable chip row.
- If CSS 3D isn't supported, the same SVG is drawn flat.
- **Accessibility:**
  - every region is a focusable link with its name;
  - arrow keys move between regions;
  - every landmark and product figure has a text name;
  - a "Regions" list under the map gives the same information as text.
- **Speed budget:** the map script is under 40 KB gzipped and loaded only on the front page. The
  geometry JSON is cached. Largest Contentful Paint on a mid-range phone, 4G, is under 2.5 s.

---

## Part 3 · Launch (Plan 6)

- **Real content before going public:**
  - pilot commitments from the NPP 2016 and NDC 2020 manifestos and the 2025 Budget Statement,
    extracted in-session and reviewed by the owner in `/admin`;
  - the first regional imports;
  - the curated places and products lists.
- **Production hosting:**
  - Vercel for the web app, with real GitHub sign-in.
  - Neon Postgres, with a database branch per PR preview.
  - Cloudflare R2 for archived documents.
  - Migrations run on deploy. The scheduled imports already exist as GitHub Actions.
  - Secrets live only in Vercel: `AUTH_SECRET`, `AUTH_GITHUB_*`, `ADMIN_GITHUB_IDS`,
    `DATABASE_URL`, `R2_*`, `REPORT_SALT`, `GPIP_CONTACT_EMAIL`.
- **Checks:**
  - axe accessibility checks run in the Playwright suite;
  - Lighthouse budgets in CI for the front page, Compare and a region page;
  - a manual pass on a real mid-range Android phone.
- **Lawyer-review pack:**
  - the disclaimer and data notice;
  - the source licences in use;
  - the corrections process;
  - the neutrality rules;
  - a list of the questions for counsel.
- **Owner actions, which only the owner can do:**
  - create the Vercel, Neon and Cloudflare accounts;
  - register a GitHub OAuth app;
  - choose a domain;
  - arrange the lawyer review;
  - approve the pilot commitments.

## Constraints
- Everything in `AGENTS.md`: the structure rules, neutrality rules, exact dependency versions, TDD,
  `pnpm check` and `pnpm e2e` green, and Codex review per PR.
- No new runtime dependency for the map, since approach A uses SVG and CSS only. Any new
  dependency elsewhere needs a one-line reason in its PR.
- Region and place data are public records, with sources cited. Photos are used only under their
  licence.

## Left to the builder
- Small-multiple chart details on Compare. Reuse the ECharts setup from the indicator pages.
- The exact DHS indicator codes, and which census tables to use first. Prefer the ones covering
  the hover-card figures.
- The interior anchor-point algorithm for figures on the map, e.g. a pole of inaccessibility.
- How the landmark and product icons are drawn, matching the mockup's style.
