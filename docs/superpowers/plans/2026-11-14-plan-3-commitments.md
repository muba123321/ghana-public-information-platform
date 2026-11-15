# Plan 3 — Commitments & Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track government commitments across changes of government — from manifesto line to
funded project to delivery — with each administration's contribution preserved; documents
archived; AI extracts commitments into a review queue; nothing reaches the public until the editor
approves it; every published change appears in a public corrections log.

**Architecture:** `core` gains commitment rules (status, kinds, stewardship chain, per-administration
contribution). `db` gains documents, commitments and their budgets/stewardships/progress/links,
editorial notes, extraction runs and public correction reports, plus review-queue repositories
that write `change_log`. `ingest` gains a document archive (local disk in dev, Cloudflare R2 in
production, one interface) and a Claude extractor that only ever writes drafts. `web` gains an
`/admin` area behind GitHub sign-in and the public commitment tracker, outstanding list, ministry
history, sources and corrections log.

**Tech Stack:** as Plans 1–2, plus `@anthropic-ai/sdk` 1.8.0 (Claude Opus 5.5), `next-auth`
5.0.0-beta.32 (Auth.js, JWT sessions, GitHub provider), `@aws-sdk/client-s3` (R2, S3 API).

**Spec:** `docs/superpowers/specs/2026-11-09-gpip-government-performance-design.md`
(§3 goal 4, §4 AI path + review queue, §5 Commitments + Editorial & audit, §6 areas 3, 6, 7, 9,
§7, §11 items 4, 5, 7)

## Global Constraints

- Plans 1–2 Global Constraints and `AGENTS.md` apply.
- **AI output is always `review_status = 'draft'`, `provenance = 'ai_extracted'`.** No code path
  publishes AI output; only an authenticated editor action does, and it writes `change_log`.
- Every commitment keeps its **original wording verbatim** and a source document + page number.
- Commitment `kind` ∈ `campaign_promise | policy_statement | approved_programme | funded_project`
  — shown everywhere; never merged ("Do not treat every manifesto statement as an approved
  government commitment").
- Status ∈ `not_started | in_progress | completed | partially_completed | stalled | discontinued |
  superseded | insufficient_evidence`; set by the editor from evidence, never inferred from
  missing data. UI never uses "broken", "failed", "kept".
- **Contribution is per stewardship** ("progress at start → progress at end" per administration);
  the administration that completes a commitment is never credited with the whole of it.
- Money: `amount` numeric + `currency` (`GHS`, `GHC` for pre-2007 old cedis, `USD`); never
  converted silently; `kind` ∈ `allocated | released | spent`; spending absent → "Not available".
- Archived documents are private unless `public_redistribution = true` (licence allows). Public
  links go to the publisher's URL.
- Claude: model `claude-opus-5-5`, adaptive thinking (default), `output_config.effort: 'high'`,
  structured output via `zodOutputFormat`, **streaming** (`max_tokens: 64000`), PDF sent as a
  base64 `document` block, server-side refusal fallback on (`betas:
  ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`); check `stop_reason` before
  reading content; typed SDK errors only. Prompt text versioned in a file; the prompt version,
  model, token usage and cost are stored on each extraction run.
- Secrets only from env: `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `AUTH_GITHUB_ID`,
  `AUTH_GITHUB_SECRET`, `ADMIN_GITHUB_IDS`, `R2_*`. Tests never need any of them.

## Review Focus

1. **Unauthenticated or non-allowlisted access to `/admin` or its server actions** — server
   actions re-check the session themselves (middleware alone is not enough). → Task 6.
2. **Claude returns a page number outside the document, empty wording, a duplicate, or refuses /
   hits `max_tokens`** — items dropped or the run marked failed; nothing half-written. → Task 4.
3. **A stewardship chain with gaps, overlaps, or a first link not in the originating
   administration** — rejected before save. → Task 1, Task 2.
4. **"Report an error" spam / oversized input** — honeypot, length limits, rate limit per IP hash;
   stored, never published automatically. → Task 8.
5. **Old cedis (GHC) vs new cedis (GHS)** — amounts labelled with their currency; never summed
   across currencies. → Task 1, Task 7.

---

### Task 1: Core commitment rules (`@gpip/core`)

**Files:** `packages/core/src/commitment.ts` (+ test); `schemas.ts` (+ test).

**Produces:**
```ts
type CommitmentKind = 'campaign_promise' | 'policy_statement' | 'approved_programme' | 'funded_project'
type CommitmentStatus = 'not_started' | 'in_progress' | 'completed' | 'partially_completed' | 'stalled' | 'discontinued' | 'superseded' | 'insufficient_evidence'
type Verification = 'government_reported' | 'independently_verified' | 'disputed'
interface StewardshipInput { administrationSlug: string; progressAtStart: number | null; progressAtEnd: number | null }  // percent 0–100
function validateStewardshipChain(chain: readonly StewardshipInput[], originating: string, timeline: readonly Tenure[]): string[]  // [] = valid; else human-readable problems
function contributions(chain): { administrationSlug: string; delta: number | null }[]   // end − start; null if either unknown
function totalsByCurrency(amounts: readonly { amount: number; currency: 'GHS'|'GHC'|'USD' }[]): Record<string, number>  // never mixes currencies
const ExtractedCommitmentSchema  // { wording ≤ 2000, page int ≥ 1, kind, sectorSlug?, responsibleInstitution?: string, target?: string, deadline?: string, budget?: { amount, currency, note } }
const ExtractionResultSchema = z.object({ commitments: z.array(ExtractedCommitmentSchema) })
```
- [ ] Tests: chain must start at `originating`; consecutive links must be consecutive
  administrations in the timeline (gap → problem naming the missing one); progress 0–100;
  `progressAtStart` of link n+1 equals `progressAtEnd` of link n when both known (else problem);
  `contributions` for a road started 2014 (0→40 under Mahama I, 40→100 under Akufo-Addo I) →
  `[40, 60]`; unknown → null, never 0; `totalsByCurrency` keeps GHC and GHS apart; schemas reject
  page 0 and empty wording.
- [ ] RED → implement → GREEN → commit `feat(core): commitment kinds, stewardship chain and contribution rules`

### Task 2: Commitment schema and public repositories (`@gpip/db`)

**Files:** `src/schema/commitments.ts`, migration, `src/repositories/commitments.ts` (+ tests).

**Tables:** `documents` (id uuid, source_id fk, title, doc_type, administration_slug null, pages
int null, mime, sha256 unique, storage_key, bytes int, public_redistribution bool default false,
archived_at); `commitments` (slug pk, wording text, document_id fk, page int, kind,
originating_administration_slug fk, announced_on date null, sector_slug fk null, target text null,
target_deadline date null, final_status, …editorialColumns); `commitment_institutions`
(commitment_slug, institution_slug); `commitment_budgets` (id, commitment_slug, kind, amount
numeric, currency, fiscal_year int null, source_id not null, page int null, …editorial);
`commitment_stewardships` (id, commitment_slug, administration_slug, progress_at_start numeric
null, progress_at_end numeric null, status, notes, unique(commitment_slug, administration_slug));
`progress_updates` (id, commitment_slug, date, description, metric_value numeric null,
verification, source_id not null, page int null, …editorial); `commitment_links` (from_slug,
to_slug, kind `supersedes|continues|duplicates`); `editorial_notes` (id, subject_type, subject_key,
kind `context|unresolved_question|timeline_narrative`, body, source_id null, …editorial);
`extraction_runs` (id, document_id, model, prompt_version, status, items_found, items_queued,
input_tokens, output_tokens, cost_usd numeric, error, started_at, finished_at);
`correction_reports` (id, page_url, message ≤ 4000, evidence_url null, contact null, ip_hash,
status `new|reviewed|actioned|dismissed`, created_at).

**Produces (published-only reads):**
```ts
listCommitments(db, f?: { administration?: string; sector?: string; kind?: CommitmentKind; status?: CommitmentStatus; q?: string }): Promise<CommitmentSummary[]>
getCommitment(db, slug): Promise<CommitmentDetail | null>  // + document, institutions, budgets, stewardships (ordered by tenure), progress, links, notes
listOutstanding(db): Promise<CommitmentSummary[]>           // final_status not completed/discontinued/superseded, with current holder
listCommitmentsForAdministration(db, slug): Promise<{ originated: CommitmentSummary[]; inherited: CommitmentSummary[]; handedOver: CommitmentSummary[] }>
listPublicDocuments(db): Promise<DocumentSummary[]>
listChangeLog(db, opts: { page: number; perPage: 50 }): Promise<{ items: ChangeLogEntry[]; total: number }>
```
- [ ] Tests: drafts never returned by any public read; stewardships ordered by administration
  start; a commitment originated under A, inherited by B → appears in A.originated/handedOver and
  B.inherited; outstanding excludes completed; `q` matches wording case-insensitively; change log
  paginates newest first.
- [ ] RED → implement → GREEN → commit `feat(db): commitments, documents, stewardship and editorial schema`

### Task 3: Document archive (`@gpip/ingest`)

**Files:** `src/archive/{store.ts,local.ts,r2.ts,archive.ts,cli.ts}` (+ tests).
```ts
interface DocumentStore { put(key: string, body: Uint8Array, contentType: string): Promise<void>; get(key: string): Promise<Uint8Array | null> }
createLocalStore(dir = '<repo>/.data/archive'): DocumentStore
createR2Store(env): DocumentStore            // @aws-sdk/client-s3, endpoint https://<account>.r2.cloudflarestorage.com
storeFromEnv(): DocumentStore                // R2 if R2_BUCKET set, else local
archiveDocument(db, store, input: { url?: string; file?: string; title; docType; publisher; administrationSlug?; publicRedistribution?: boolean; fetchImpl? }): Promise<{ documentId: string; duplicate: boolean }>
```
- Computes SHA-256; same hash → returns existing document (`duplicate: true`), no second copy;
  counts PDF pages (`/Type /Page` scan is enough; null if unknown); creates/links a `sources` row.
- CLI: `pnpm archive --url <u> | --file <path> --title … --type manifesto --publisher …`.
- [ ] Tests: archive local file → stored + row; same bytes twice → one row; non-PDF accepted with
  pages null; fetch failure → no row, error; store key = `documents/<sha256>.<ext>`.
- [ ] RED → implement → GREEN → commit `feat(ingest): document archive with local and R2 stores`

### Task 4: Claude commitment extractor (`@gpip/ingest`)

**Files:** `src/extract/{prompt.v1.md,extract.ts,cli.ts}` (+ test, fixture response JSON).
```ts
interface ExtractDeps { client: Pick<Anthropic, 'beta'>; store: DocumentStore; now?: () => Date }
extractCommitments(db, deps, documentId: string): Promise<{ runId: number; status: 'ok'|'failed'; found: number; queued: number; error?: string }>
```
- One streamed `client.beta.messages.stream({...})` → `finalMessage()`; PDF as base64 document
  block before the instruction text; `output_config: { effort: 'high', format: zodOutputFormat(ExtractionResultSchema) }`;
  parse the text block with `ExtractionResultSchema` (do not trust unvalidated JSON).
- `stop_reason` `refusal` or `max_tokens` → run `failed` with reason, nothing queued.
- Drop items with page > document pages, empty wording, or normalised-wording duplicates (within
  the run and against existing commitments for the document). Queue survivors as draft commitments
  (`provenance 'ai_extracted'`, slug `<admin>-<short-hash>`), kind as extracted (editor confirms).
- Store model, prompt version (`v1`), usage tokens and cost (Opus 5.5: $4 / $20 per MTok) on the run.
- Prompt (`prompt.v1.md`): extract only explicit, checkable commitments; copy wording verbatim;
  classify kind by document type (a party manifesto yields `campaign_promise`); give the printed
  page number as the PDF page index; never infer delivery or judge feasibility.
- CLI: `pnpm extract --document <id>`; prints found/queued/cost.
- **Session-assisted path (no API key):** `pnpm extract --document <id> --from-json <file>` takes
  an `ExtractionResultSchema` file prepared by Claude Code reading the PDF in a session, and runs it
  through the same validation, dedupe and queueing (`model: 'claude-code-session'`, cost 0). One
  shared `queueExtraction(db, documentId, result, meta)` function serves both paths.
- [ ] Tests: `--from-json` path queues the same way and records `claude-code-session`; invalid file → failed, 0 queued.
- [ ] Tests (fake client returning recorded streamed final message): queues valid items as
  drafts; drops out-of-range page, empty, duplicate; refusal → failed, 0 queued; max_tokens →
  failed; malformed JSON → failed; usage → cost computed; request built with model
  `claude-opus-5-5`, document block first, effort high, fallback beta.
- [ ] RED → implement → GREEN → commit `feat(ingest): Claude commitment extraction into the review queue`

### Task 5: Review-queue repositories (`@gpip/db`)

**Files:** `src/repositories/review.ts` (+ test).
```ts
reviewCounts(db): Promise<{ commitments: number; corrections: number }>
listReviewQueue(db, opts?: { documentId?: string }): Promise<ReviewItem[]>
getReviewItem(db, slug): Promise<ReviewItem | null>   // includes document id + page for side-by-side view
approveCommitment(db, slug, edits: CommitmentEdit, reviewer: string): Promise<void>   // validates (core), sets published, reviewedBy/At, change_log
rejectCommitment(db, slug, reason: string, reviewer: string): Promise<void>
saveStewardships(db, slug, chain: StewardshipInput[], reviewer): Promise<string[]>    // problems from validateStewardshipChain; saves only if []
listCorrectionReports(db, status?), setCorrectionStatus(db, id, status, reviewer)
```
- [ ] Tests: approve publishes + logs before/after with reviewer; reject keeps the row as
  `rejected` (audit) and out of queue; an invalid edit (empty wording, page 0, unknown kind) throws
  and changes nothing; invalid chain not saved and problems returned; approving twice is a no-op.
- [ ] RED → implement → GREEN → commit `feat(db): review queue with audited approve/reject`

### Task 6: Admin sign-in and review screens (`apps/web`)

**Files:** `auth.ts`, `middleware.ts`, `app/admin/{layout,page}.tsx`,
`app/admin/review/{page.tsx,[slug]/page.tsx,actions.ts}`, `app/admin/documents/{page.tsx,actions.ts,[id]/file/route.ts}`,
`app/admin/corrections/page.tsx`, `lib/admin.ts` (+ tests), e2e `admin.spec.ts`.
- Auth.js v5, JWT sessions, GitHub provider; `signIn` callback allows only logins in
  `ADMIN_GITHUB_LOGINS`. `requireEditor()` in `lib/admin.ts` used by **every** admin page and
  server action. Dev/e2e-only credentials provider enabled when `AUTH_DEV_LOGIN=1` **and**
  `NODE_ENV !== 'production'` (asserted at startup).
- Review item page: left = archived PDF at the cited page (`/admin/documents/<id>/file#page=N`,
  served only to editors), right = form (wording, kind, sector, institution, target, deadline,
  originating administration, status), Approve / Reject (reason) / Save stewardships.
- Documents page: list + upload (archives via Task 3) + "Extract commitments" (Task 4) with run
  history (status, found, queued, cost).
- [ ] Tests: `requireEditor` rejects no session / non-allowlisted login; e2e: anonymous `/admin`
  → sign-in page; anonymous POST to an approve action → 401/redirect and nothing changes; dev
  editor approves a seeded draft → appears on public tracker; reject → absent; `/admin/documents/<id>/file`
  anonymous → 401.
- [ ] RED → implement → GREEN → screenshots → commit `feat(web): admin sign-in, review queue and document tools`

### Task 7: Public commitment pages (`apps/web`)

**Files:** `app/history/commitments/{page.tsx,[slug]/page.tsx}`, `app/history/outstanding/page.tsx`,
`app/history/ministries/{page.tsx,[slug]/page.tsx}`, `app/history/sources/page.tsx`,
`components/{CommitmentCard,StewardshipTimeline,KindBadge,StatusLabel,MoneyList}.tsx` (+ tests); profile section on administration page.
- Tracker: filters (administration, sector, kind, status, search) as query params, no client JS.
- Commitment page: verbatim wording in a quote with document + page link; kind badge; **stewardship
  timeline** — one bar per administration on the ribbon's neutral tones showing progress at start →
  end with "Progress during this government: +40 points"; budgets grouped by currency
  (allocated / released / spent, "Not available" when absent); progress updates with verification
  level; links (continues/supersedes); unresolved questions.
- Outstanding: unfinished commitments grouped by current holder.
- Ministries: institution history (versions + lineage) and commitments by institution.
- Sources: documents with publisher link; download only if `public_redistribution`.
- Administration profile: "Commitments" section — originated / inherited / handed over.
- History landing + home: commitments, outstanding, ministries, sources become live.
- [ ] Tests: StewardshipTimeline renders one bar per administration with neutral tones and
  "+40 points"/"Not available"; MoneyList never sums GHC with GHS; KindBadge text for each kind;
  e2e (seeded fixture commitment spanning two administrations): tracker filter by kind; detail
  shows both administrations' contributions; outstanding lists it; sources hides download when not
  redistributable.
- [ ] RED → implement → GREEN → screenshots (desktop/mobile, light/dark) → commit
  `feat(web): commitment tracker, stewardship timeline, outstanding, ministries and sources`

### Task 8: Corrections — report an error and public change log

**Files:** `app/report/page.tsx` + `actions.ts`, `app/changes/page.tsx`, footer link, `lib/rate-limit.ts` (+ tests).
- Form: page URL (prefilled from `?from=`), message (≤ 4000), optional evidence URL and contact;
  hidden honeypot field; rate limit 5 per IP-hash per hour (hash with `AUTH_SECRET` salt; raw IP
  never stored). Confirmation page: "Thank you — an editor will review this."
- `/changes`: public, paginated change log of published changes ("Updated", "Added", "Retired"),
  linking to the affected page; no reviewer identities shown.
- [ ] Tests: honeypot filled → silently accepted, not stored; > 4000 chars → error; 6th report in
  an hour → error; IP stored only as hash; e2e: report → appears in `/admin/corrections`; approving
  a commitment adds an entry on `/changes`.
- [ ] RED → implement → GREEN → commit `feat(web): report-an-error form and public change log`

### Task 9: Institution seed (Fourth Republic, six sectors)

**Files:** `packages/db/src/seed/data/institutions.ts` (+ sources), seed wiring, test.
- Current (2025) ministries for economy, agriculture, education, health, infrastructure (roads,
  energy, works & housing, transport, water/sanitation), social development (gender & social
  protection, employment) with `institution_versions`, plus documented renames/merges since 2001
  as `institution_lineage`. Every row cites a source (Presidency/Parliament/Gazette preferred);
  anything unverifiable is left out, not guessed.
- [ ] Tests: every version has a source; versions per institution don't overlap (DB constraint);
  each sector has ≥ 1 institution; lineage endpoints exist.
- [ ] RED → implement → GREEN → commit `feat(db): Fourth Republic ministries and lineage seed`

## Done when

`pnpm check && pnpm build && pnpm e2e` green; one real manifesto archived and extracted locally
with the owner's API key (cost reported), its drafts reviewed in `/admin`; Codex + fresh reviewer
findings addressed; issue #7 closed by the PR.

## Owner actions (not blocking the build)

1. `ANTHROPIC_API_KEY` (or `ant auth login`) for real extractions — about $2 per 150-page manifesto.
2. A GitHub OAuth app (callback `http://localhost:3000/api/auth/callback/github`, later the
   production URL) → `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`; `ADMIN_GITHUB_IDS=105753631` (permanent GitHub account id, not the renameable username).
3. Cloudflare R2 bucket + token — only needed at deployment (Plan 4).
