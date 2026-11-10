# GPIP — Government Performance & History: Design

Date: 2026-11-09 · Status: draft for approval · Source idea: `idea.md`

## 1. Intent

The Ghana Public Information Platform (GPIP) gives Ghanaians one neutral, sourced place to see
what successive governments promised, what they funded, what they delivered, and what they handed
over unfinished — and how the country's economic and social indicators moved across those
administrations.

This first module, **Government Performance & History**, is also the foundation of the wider
platform: the entities it creates (administrations, institutions, sources, indicators) are the
shared backbone future modules will reuse.

**Why it matters.** Ghana already has promise trackers, but each is partisan (the 2020 government
`delivery.gov.gh` vs. the opposition `nppfailedpromises.com`), one-off (IMANI 2019 scorecard), or
narrow (STAR-Ghana health-only 2025, RISE-Ghana district-level). Pan-African tools (Code for
Africa PromiseTracker, Buharimeter) track one leader at a time. None preserves a commitment's
history *across* changes of government, and none refuses to score. That gap is GPIP's reason to
exist. Credibility across party lines is the product.

## 2. Users

- **Ordinary citizens** — mostly on mobile, often on slow or expensive data. Need plain-English
  answers ("was the hospital in my region built?", "how did inflation move under each
  government?").
- **Journalists** — need citable numbers: every figure with source, reporting period, and a
  download link; stable URLs they can link in stories.
- **Investors, researchers, NGOs, development partners** — need long-run consistent series,
  methodology notes, CSV and API access.

**Success looks like:** journalists cite GPIP; supporters of every party accept its figures as fair
even when they dislike them.

## 3. Goals, non-goals, anti-goals

**Goals (v1)** — follow `idea.md` §11 in order:
1. Historical database architecture.
2. Administration entity and full historical timeline (1957 → present).
3. Administrations linked to ministries/institutions, surviving renames and reorganisations.
4. Commitments linked to originating administrations, with cross-administration history.
5. Indicators with annual/quarterly/monthly observations, revisions and multiple sources.
6. Historical charts with administration periods shaded.
7. Administration comparison interface.
8. A small, verified starter dataset (see §9).

**Non-goals (v1):** public user accounts, comments, local-language translations (design for i18n,
ship English), regional/district data population (schema supports geography; v1 populates
national only), native mobile apps, other GPIP modules.

**Anti-goals — failure even if it technically works:**
- Any score, grade, ranking, or "success/failure" verdict on an administration.
- Any figure shown without its source and reporting period.
- Missing data rendered as zero, as failure, or silently omitted — it must say "not available".
- Crediting an entire project to the administration that completed it.
- Implying causation from correlation ("inflation fell *because of* X").
- Visual or editorial asymmetry between parties (see §7 neutrality rules).
- AI-extracted content reaching the public without human approval.

## 4. Data sources and how data gets in

All data is already public. Three ingestion paths, all writing through one pipeline that records
provenance:

| Path | Content | Publication rule |
|---|---|---|
| **API importers** (scheduled) | World Bank WDI, IMF (WEO/IFS), AfDB Open Data for Ghana, UN agencies (WHO, UNESCO UIS) | Auto-publish; values are verbatim from the publisher |
| **Table importers** (per source) | Ghana Statistical Service StatsBank, Bank of Ghana data portal, Ministry of Finance budget tables | Auto-publish when parsed from structured tables; review queue when parsed from PDF |
| **AI-assisted extraction** (Claude) | Manifestos, budget statements, national development plans, policy statements, ministry strategic plans | **Always** review queue; a human approves before publish |

Every original document is archived (copy in object storage + SHA-256 + retrieval date), so a
source link never dies even if the government website does.

**Review queue:** the single editor (the project owner) uses an `/admin` screen showing the
extracted record side-by-side with the source page, and approves, edits, or rejects. The model
supports more reviewers later.

## 5. Domain model

The core of the system. Names are indicative; the builder may refine naming but not the
relationships or the invariants.

**Political structure**
- `Person` — presidents, vice-presidents, heads of state, ministers.
- `Party` — political parties; also a "military regime" kind for non-party governments.
- `Administration` — **one per term of government**: constitutional terms in the Fourth Republic
  (aligned with the election + manifesto that produced them), and each regime period before 1993
  (CPP, NLC, Progress Party, NRC/SMC I/SMC II, AFRC, PNP, PNDC). Fields: slug, kind
  (civilian / military / transitional), party, head of state, vice, start date, end date (null if
  incumbent), manifesto document(s), development plan(s). Also the stable `presidency` grouping so
  users can compare by person (e.g., both Akufo-Addo terms) or by term.
- Real historical dates only; each `Administration` cites its source.

**Institutions over time**
- `Institution` — stable identity of a ministry/agency/department across its whole life.
- `InstitutionVersion` — name, mandate, parent, valid-from / valid-to, under which administration.
- `InstitutionLineage` — typed edges between institutions: renamed, merged-into, split-from,
  replaced-by, absorbed-functions-of. Lets "Ministry of Roads and Highways" history be traced
  through every reorganisation.
- `Sector` — fixed taxonomy: Economy, Agriculture, Education, Health, Infrastructure,
  Social Development (extensible).

**Sources**
- `Source` — publisher (GSS, BoG, MoF, World Bank, IMF, party, …), document type, title, URL,
  archived file key, SHA-256, published date, retrieved date, licence.
- Every factual record below carries a `source_id` (+ page/table reference where applicable).
  Enforced at the database level (NOT NULL), not just in the UI.

**Commitments**
- `Commitment` — original wording (verbatim), source + page, **kind**:
  `campaign_promise` | `policy_statement` | `approved_programme` | `funded_project`
  (never collapsed together), originating administration, announcement date, responsible
  institution(s), sector, target (text, plus optional structured value/unit/linked indicator),
  target deadline.
- `CommitmentBudget` — allocations and revisions over time (amount, currency, year, source).
- `CommitmentStewardship` — **one row per administration that held the commitment.** Records:
  inherited-from (previous stewardship), progress at start, progress at end, additional funding,
  revisions to target/scope, notes. This is how a commitment survives transitions and how each
  administration's contribution is preserved.
- `ProgressUpdate` — dated, sourced evidence: description, optional metric value, verification
  level: `government_reported` | `independently_verified` | `disputed`.
- **Status** (per stewardship and final): `not_started`, `in_progress`, `completed`,
  `partially_completed`, `stalled`, `discontinued`, `superseded`, `insufficient_evidence`.
  Status is set by a reviewer from evidence; it is never auto-inferred from missing data.
- Commitments can link to other commitments (`supersedes`, `continues`, `duplicates`) — e.g. a
  manifesto promise that later became a funded programme.

**Indicators**
- `Indicator` — code, name, plain-English definition, unit, frequency, sector, methodology notes.
  **No "good direction" field** — the platform does not judge whether up is good.
- `Observation` — indicator, period start/end, frequency, geography (national in v1), value,
  source, **vintage** (release date). Revisions are new rows, never overwrites; the latest vintage
  per source is the default view, older vintages remain queryable. Multiple sources for the same
  indicator coexist (data-source comparison).
- `Target` — indicator target values declared by an administration (with source), so charts can
  show target vs. actual.
- `ContextEvent` — dated annotations shown on charts: international shocks (2008 crisis, COVID-19,
  commodity price swings), methodology changes (GDP rebasings, CPI rebasings), the 2007 cedi
  redenomination, institutional changes, data-coverage changes.

**Editorial & audit**
- Every editorial record has `review_status` (draft / in_review / published / rejected),
  `provenance` (api / table_import / ai_extracted / manual), reviewer, reviewed-at.
- An append-only `ChangeLog` records every published change; exposed publicly as a corrections log.

**Attribution rule (core invariant).** An observation is *associated* with the administration(s)
in office during its period, by overlap of dates. Periods spanning a transition are flagged as
transition periods and shown as such, not silently assigned. The UI always labels this "in office
during", never "achieved by". Commitment credit is per stewardship, never to the finisher alone.

## 6. Public experience — "Government Performance & History"

Nine areas from `idea.md` §10. v1 ships all nine at a basic level, deepening over time:

1. **Administration directory** — timeline of every government since 1957.
2. **Administration profile** — identical template for every administration: dates, leaders,
   party, manifesto & plans, commitments (by kind and status), resources allocated vs. spent,
   indicators during tenure, inherited and handed-over commitments, unresolved questions, data
   availability & reliability panel.
3. **Commitment tracker** — filter by administration, sector, institution, kind, status; each
   commitment page shows its full cross-administration timeline.
4. **Indicators** — browse by sector; each indicator page has a long-run chart with
   administration bands and context events, YoY change, source and vintage selector.
5. **Compare** — pick 2+ administrations (or presidencies) and a sector; side-by-side indicator
   values over each tenure, with baseline (value inherited at start) shown alongside, plus
   per-capita / %-of-GDP views where available.
6. **Ministry history** — institution lineage and commitments by institution over time.
7. **Outstanding commitments** — everything not completed, with who holds it now.
8. **Development timelines** — narrative timeline of indicators + context events.
9. **Sources** — every document and dataset, downloadable.

Every chart has: a "data & sources" drawer, a table alternative (accessibility), CSV download, a
stable permalink, and a short plain-English "how to read this" note.

## 7. Neutrality and fairness rules (product requirements)

- No party colours for administrations; use a neutral palette assigned by chronology.
- Lists are chronological or alphabetical only — never sorted by "performance".
- Same profile template and same indicator set shown for every administration.
- Fair-comparison context always visible on comparisons: inherited baseline, context events,
  methodology breaks, population change (per-capita views), delayed-effect caveat.
- Missing data is an explicit visual state ("Not published / not available"), never a gap that
  looks like zero.
- Observed change and causal claims are kept separate in copy and data.
- Public corrections log; a "report an error" link on every record (emails/queues to the editor;
  no public accounts needed).
- Published methodology page explaining all of the above.

## 8. Technical approach (builder's choices made by Claude, explained to owner)

- **Language:** TypeScript everywhere, strict mode — one set of domain types shared by site,
  importers and tests; no duplicated definitions.
- **Monorepo:** pnpm workspaces + Turborepo.
  - `apps/web` — Next.js (App Router): public site, `/admin` review screens, read-only public API
    (`/api/v1/...` JSON + CSV).
  - `packages/core` — pure domain logic and Zod schemas (period maths, attribution, status rules,
    stewardship chaining). No I/O. Highest test coverage.
  - `packages/db` — Drizzle schema, migrations, seed data, and the query/repository layer. The
    only package that talks to Postgres.
  - `packages/ingest` — pipeline + one adapter per source (`worldbank`, `imf`, …) and the
    Claude-based document extractor; runnable as a CLI.
  - Shared `tsconfig` / lint config packages.
- **Database:** PostgreSQL (Neon in production). Temporal ranges and FK constraints carry the
  invariants (source NOT NULL, stewardship chain, non-overlapping institution versions).
- **Charts:** Apache ECharts (administration bands via mark areas, good mobile support).
- **AI extraction:** Claude API (latest Sonnet-class model) with structured output into the
  review queue; prompts and outputs versioned.
- **Admin auth:** Auth.js with an email allowlist (single editor in v1).
- **Performance budget:** server-rendered pages, minimal client JS on public pages, works on 3G;
  WCAG 2.2 AA.
- **Quality:** TDD. Vitest (unit, `core`), Vitest + PGlite (integration, `db`/`ingest`, no Docker
  required), Playwright (end-to-end key journeys). Biome for lint/format. GitHub Actions runs
  typecheck, lint, tests, build on every PR; `main` is protected.
- **Conventions:** `AGENTS.md` is the single source of coding rules for both Claude and Codex
  (`CLAUDE.md` points to it). Conventional commits; small PRs; every PR linked to an issue.

## 9. v1 starter dataset (verified public sources only)

- **Administrations:** all governments 1957 → present (~20 records), with sources.
- **Institutions:** Fourth Republic ministries for the six sectors, with lineage where it's
  documented.
- **Indicators (~15, World Bank/IMF APIs, back to 1960 where available):** GDP growth, inflation,
  public debt % GDP, revenue % GDP, expenditure % GDP, fiscal balance, exchange rate (GHS/USD),
  unemployment, poverty headcount, school enrolment (primary/secondary), maternal mortality,
  under-5 mortality, electricity access, improved water access, cereal production.
- **Commitments:** a small pilot set across two or three administrations chosen to exercise the
  model — at least one commitment that crosses a change of government (e.g. a major hospital or
  road programme), one that moved from campaign promise to funded programme, and one with
  disputed evidence. Extracted with AI, approved in the review queue.

## 10. Delivery and collaboration

- **GitHub:** repository under `muba123321`, GitHub Project board with one issue per plan task,
  milestones mirroring §3 goals, labels by area (`core`, `db`, `ingest`, `web`, `data`).
  Issues, PRs and the board stay in sync via issue links in PRs and auto-close on merge.
- **Claude Code:** architecture, plans, most implementation.
- **Codex:** independent review of every PR before merge; implements self-contained issues in
  parallel (e.g. individual source adapters) against the same `AGENTS.md`.
- **Hosting (recommended):** Vercel (web), Neon (Postgres, branch per PR preview), Cloudflare R2
  (archived documents), GitHub Actions cron (scheduled imports). Free tiers to start; est.
  $20–50/month with real traffic. Alternatives: Railway or Fly.io.

## 11. Decisions settled after builder review (Claude's calls unless marked)

1. **Transition periods.** A period is *associated* with the administration in office for the
   majority of it, and every period containing a handover is also flagged `transition` and shown
   as such. **Inherited baseline** = the last complete period ending before the administration's
   start date. Both rules live in `packages/core` and are published on the methodology page.
2. **Administration boundaries.** One `Administration` per constitutional term or regime
   (NRC, SMC I and SMC II are separate records). Leaders are a child table
   (`AdministrationLeader`: person, role — head of state / head of government / vice — from/to),
   so 2012 is one term with Mills then Mahama, and 1957–60 records the Crown as head of state and
   Nkrumah as head of government. "Compare by person" is **derived from leader records** rather
   than a separate `Presidency` table (one source of truth; handles 2012 cleanly): Rawlings'
   AFRC, PNDC and two NDC terms group together, as do Mahama's non-consecutive periods.
3. **v1 importers.** World Bank and IMF API adapters plus the Claude document extractor only.
   GSS, BoG, MoF, AfDB, WHO, UNESCO adapters are later issues (good candidates for Codex).
4. **Money.** `CommitmentBudget` has a `kind`: `allocated` | `released` | `spent`. Spending is
   recorded when a source publishes it (e.g. Auditor-General, budget outturns) and otherwise
   displayed as "not available"; v1 does not need spending data populated.
5. **Archived documents.** Archived copies are private by default. The public link always points
   to the original publisher URL; the archived copy is served publicly only when the source's
   licence allows redistribution (e.g. CC-BY datasets). If the original link dies, the page shows
   "original no longer online — archived copy held" with the archive date.
6. **Competing sources.** Each `Indicator` names a documented `preferred_source`; other sources
   remain viewable side-by-side. `Observation` has an `estimate_type`:
   `reported` | `modelled` | `projected`. Modelled values are published but visibly marked;
   projections are never shown as actuals.
7. **Context events & editorial text.** `ContextEvent` covers international, methodological,
   institutional and *domestic* events (coups, IMF programmes, the 2022 debt restructuring,
   power crises) — included only when documented by a reputable source, written as dated facts
   with no evaluative language. All editorial prose (context events, timeline narrative,
   "unresolved questions") is an `EditorialNote` record that goes through the same review queue
   and change log as commitments.
8. **Tenure summaries (owner decision).** No single headline number per administration anywhere
   in the UI. Compare shows each tenure's full series with the inherited baseline and the end
   value labelled. A downloadable/expandable table offers *both* the period average and the
   start-to-end change side by side; formulas are defined once in `packages/core` and documented
   on the methodology page.
9. **Repository visibility (owner decision).** Public from day one. Code licence: MIT. Data is
   redistributed only under each source's own licence (see item 5), stated per source.
10. **Public-data notice and disclaimer (owner requirement).** To protect credibility and reduce
    legal exposure:
    - A short, always-visible notice in the site footer: *"All information on this platform is
      compiled from publicly available sources published by Ghanaian public institutions,
      political parties and international organisations. Every figure links to its original
      source. GPIP is independent and is not affiliated with the Government of Ghana or any
      political party."*
    - A full **Data notice & disclaimer** page: sources and licences; no endorsement; figures
      reproduced as published (errors in source data are the publisher's, flagged where known);
      "in office during" is not a claim of causation; no warranty; how to request a correction;
      contact address.
    - Every record shows its source and retrieval date; the corrections log and "report an error"
      link (§7) are the response path for disputes.
    - Before public launch, the notice and disclaimer page should be reviewed by a Ghanaian
      lawyer (defamation, data-protection and copyright law). A disclaimer lowers risk but is not
      a guarantee; accurate sourcing and fast corrections are the real protection.

## 12. Left to the builder

Exact table/column names, URL structure, component library choices within the stack, ECharts
configuration, importer scheduling frequency, page-level visual design (within the neutrality and
accessibility rules), test file layout, and the specific pilot commitments chosen (within §9
criteria).
