# Web Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `apps/web` into thin routes, feature folders, a walled-off server layer and per-component CSS modules, with no visible, behavioural or URL change.

**Architecture:** Next.js `src/` layout. `app/` holds routes only. `features/<area>/` holds components, labels, pure helpers and `server/` (queries, actions). Shared `components/{layout,ui}`, `server/` (infrastructure) and `lib/` (pure helpers) sit beside them. An architecture test, `server-only` and a local screenshot suite enforce the design.

**Tech Stack:** Next.js 16.4.5 (Turbopack), React 19.3, TypeScript 5.9.3, CSS Modules, Vitest 5.1, Playwright 1.65, Biome, `server-only` 0.0.1 (already a dependency).

**Spec:** `docs/superpowers/specs/2026-11-15-web-architecture-design.md`

## Global Constraints

- No visual, behaviour, URL, API or data change. `pnpm e2e:visual` (Task 1) must pass after every task from Task 2 on.
- `pnpm check` and `pnpm e2e` stay green after every task. No test is deleted. A moved test keeps its assertions.
- Component files are `PascalCase.tsx` named after their one exported component, with `PascalCase.module.css` and `PascalCase.test.tsx` beside them. Every other file and folder is `kebab-case`. Next reserved names stay as they are.
- Every file in any `server/` folder starts with `import 'server-only';` (after `'use server'` for action files).
- Admin-only server code lives in `admin-actions.ts` / `admin-queries.ts`. Every exported function there calls `await requireEditor()` first.
- Features expose browser-safe parts through `features/<x>/index.ts` only. Never import another feature's `server/`, and never deep-import past its `index.ts`.
- Exact dependency versions. Conventional commits. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Neutrality rules in `AGENTS.md` are unchanged (footer notice text is fixed: move the component, never edit its copy).

## Review Focus

1. **Dark mode.** Moving CSS can reorder `@media (prefers-color-scheme: dark)` overrides, and a module rule may beat its dark override. The visual suite covers dark mode (Task 1).
2. **Phone width.** Responsive rules separated from their base rule can stop applying. The visual suite covers a 390 px viewport (Task 1).
3. **Unit tests importing server files.** `server-only` throws outside React Server Components, so Vitest must alias it to an empty module (Task 3). Otherwise every `server/*.test.ts` fails to load.
4. **Global utility classes vs module classes.** Where a component used both a page class and a utility (`.muted`, `.stack`), specificity can change once the page class becomes a module class. Screenshots catch the visual cases. Keep utilities in `base.css` with the same selectors.
5. **Route group `(public)`.** It must not change any URL, and `/api/*` and `/admin/*` stay outside it. Pin this with an e2e `goto` on every public URL (the visual list covers it).

---

### Task 1: Local screenshot suite (baseline on current code)

**Files:**
- Modify: `apps/web/playwright.config.ts`, `apps/web/package.json`, `.gitignore`
- Create: `apps/web/e2e/visual/pages.visual.ts`

**Interfaces:**
- Produces: `pnpm --filter @gpip/web e2e:visual`, which every later task runs.

- [ ] **Step 1: Configure the projects.**
  - `chromium` gets `testMatch: /.*\.spec\.ts/`. `pnpm e2e` keeps running only `--project=chromium`; change the `e2e` script to `playwright test --project=chromium`.
  - Add four projects with `testMatch: /.*\.visual\.ts/`:
    - `visual-desktop-light`: Desktop Chrome, `colorScheme: 'light'`.
    - `visual-desktop-dark`: Desktop Chrome, `colorScheme: 'dark'`.
    - `visual-phone-light`: viewport 390×844, `colorScheme: 'light'`.
    - `visual-phone-dark`: viewport 390×844, `colorScheme: 'dark'`.
  - Script: `"e2e:visual": "playwright test --project='visual-*'"`.
  - Set `snapshotPathTemplate: '{testDir}/visual/__screenshots__/{projectName}/{arg}{ext}'`.
  - Gitignore `apps/web/e2e/visual/__screenshots__/`.
- [ ] **Step 2: Write `pages.visual.ts`.**
  - One test per URL, with a full-page screenshot: `await expect(page).toHaveScreenshot(name, { fullPage: true, animations: 'disabled' })`.
  - Public: `/`, `/history`, `/history/administrations`, `/history/administrations/2017-akufo-addo-i`, `/history/indicators`, `/history/indicators/inflation`, `/history/indicators/poverty`, `/history/commitments`, `/history/commitments?kind=funded_project`, `/history/commitments/e2e-eastern-corridor`, `/history/outstanding`, `/history/ministries`, `/history/ministries/<first slug listed on /history/ministries>`, `/history/sources`, `/changes`, `/report?from=%2F`, `/report/thanks`, `/data-notice`.
  - Admin, signed in with the same helper `e2e/admin.spec.ts` uses: `/admin`, `/admin/review`, `/admin/review/<first queue item>`, `/admin/documents`, `/admin/corrections`.
  - For chart pages, wait for the `canvas` to be visible before the screenshot.
- [ ] **Step 3: Record the baseline.** Run `pnpm --filter @gpip/web e2e:visual --update-snapshots`, then run `pnpm --filter @gpip/web e2e:visual` twice more. Expected: all pass both times (proves the screenshots are stable). Mask any element that flickers with `mask: [...]` and note it in the file.
- [ ] **Step 4: Commit** (`test(web): local screenshot suite for the architecture refactor`).

### Task 2: `src/` layout, `@/` alias, route group (moves only)

**Files:**
- Move: `apps/web/{app,components,lib}` to `apps/web/src/`.
- Move: `apps/web/auth.ts` → `apps/web/src/server/auth.ts`, `apps/web/instrumentation.ts` → `apps/web/src/instrumentation.ts`.
- Move public routes into `src/app/(public)/`: `page.tsx`, `history/`, `changes/`, `report/`, `data-notice/`. `layout.tsx`, `globals.css`, `admin/` and `api/` stay directly in `src/app/`.
- Modify: `tsconfig.json` (`"paths": { "@/*": ["./src/*"] }`), `vitest.config.ts` (include globs under `src/`, plus the same `@` alias via `resolve.alias`).

- [ ] **Step 1:** `git mv` everything above, and rewrite relative imports that cross folders to `@/…`. Keep same-folder `./x` imports.
- [ ] **Step 2:** Run `pnpm check && pnpm e2e && pnpm --filter @gpip/web e2e:visual`. Expected: all pass, with no screenshot diffs.
- [ ] **Step 3: Commit** (`refactor(web): src/ layout, @/ alias, (public) route group`).

### Task 3: Shared server layer and the architecture test

**Files:**
- Move to `src/server/`:
  - `lib/db.ts` → `db.ts`
  - `lib/shutdown.ts` → `shutdown.ts`
  - `lib/flash.ts` → `flash.ts`
  - `lib/files.ts` → `archived-file.ts`
  - `lib/sender.ts` → `sender.ts`
  - `lib/editors.ts` → `editors.ts`
  - `lib/admin.ts` → `editor-access.ts` (`currentEditor`, `requireEditor`) plus `archive-store.ts` (`archiveStore`)
  - `lib/api.ts` → `api.ts`
  - Tests move with their files.
- Move: `app/admin/actions.ts` (`signOutAction`) → `src/server/auth-actions.ts`.
- Create: `src/architecture.test.ts`, `src/test/server-only-stub.ts` (empty export).
- Delete: `app/admin/guard.test.ts` (its rule moves into the architecture test, made stricter).
- Modify: `vitest.config.ts` (`resolve.alias: { 'server-only': <path to stub> }`).

**Interfaces:**
- Produces: `@/server/editor-access` → `currentEditor(): Promise<string|null>`, `requireEditor(): Promise<string>`; `@/server/archive-store` → `archiveStore(): DocumentStore`; `@/server/auth-actions` → `signOutAction()`. Other names unchanged.

- [ ] **Step 1: Write `architecture.test.ts`** with these rules. It walks `src/` with `readdirSync(…, { recursive: true })` and uses regex over import lines, so no new dependency is needed.
  - `server files start with server-only`: every `.ts` under any `server/` folder, except `*.test.ts`, has `import 'server-only'` within its first 3 lines.
  - `file naming`:
    - `.tsx` files outside `app/` match `^[A-Z][A-Za-z0-9]*(\.test)?\.tsx$`, and the file's exported component name equals its basename.
    - Other files and folders match `^[a-z0-9-]+(\.test|\.module)?\.(ts|css)$` or `^[a-z0-9-]+$`.
    - Next reserved names, `[param]` / `[...param]` / `(group)` folders, and `*.csv` route folders are allowed.
  - `admin guard`: in every `admin-actions.ts` / `admin-queries.ts`, each `export async function` body contains `await requireEditor()`. Every `page.tsx` / `route.ts` under `app/admin/` contains `await requireEditor()` or `await currentEditor()`. A rule that matches no files fails, so a test finding nothing can never pass silently.
  - Keep the rule list in a `RULES` array, so Task 9 can add rules.
- [ ] **Step 2:** Run `pnpm --filter @gpip/web exec vitest run src/architecture.test.ts`. Expected: FAIL. The server files lack `server-only`, and the admin actions are still in `actions.ts`, so the guard finds 0 admin files.
- [ ] **Step 3: Make it pass.**
  - Do the moves and add `import 'server-only'`.
  - Rename the admin `actions.ts` under `app/admin/{review,documents,corrections}` to `admin-actions.ts` for now (Task 8 moves them into features). Update their imports.
  - Add the Vitest `server-only` alias.
- [ ] **Step 4:** Run `pnpm check && pnpm e2e && pnpm --filter @gpip/web e2e:visual`. Expected: all pass.
- [ ] **Step 5: Commit** (`refactor(web): walled-off server layer and architecture test`).

### Task 4: One home for date maths and sectors

**Files:**
- Modify: `packages/core/src/period.ts` (+ test), `apps/web/src/lib/format.ts` (+ test)
- Create: `packages/db/src/repositories/sectors.ts` (+ `sectors.test.ts`); export it from `packages/db/src/index.ts`

**Interfaces:**
- Produces:
  - `@gpip/core`: `monthsBetween(a: IsoDate, b: IsoDate): number` and `fullYearsBetween(a: IsoDate, b: IsoDate): number`.
  - `@gpip/db`: `listSectors(db: Db): Promise<{ slug: string; name: string }[]>`, sorted by `name`.

- [ ] **Step 1: Failing tests.**
  - Move the `fullYearsBetween` cases from `lib/format.test.ts` into `period.test.ts`, unchanged (`'1957-03-06'→'2026-11-10'` is 69, `'2027-03-05'` is 69, `'2027-03-06'` is 70).
  - Add `monthsBetween('2024-01-31','2024-02-29')` = 0 and `monthsBetween('2024-01-15','2025-03-15')` = 14.
  - `sectors.test.ts`: after `seed(db)`, `listSectors` returns every seeded sector, and the names are in `localeCompare` order.
- [ ] **Step 2:** Run both packages' tests. Expected: FAIL (not exported).
- [ ] **Step 3: Implement.**
  - Move the functions into `period.ts`. `lib/format.ts` imports them from `@gpip/core`; delete its copies.
  - Implement `listSectors`.
- [ ] **Step 4:** Run `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** (`refactor: date maths in core, listSectors in db`).

### Task 5: Shared layout and UI components

**Files:**
- Move to `src/components/layout/`: `SiteHeader`, `SiteFooter` (+ test), `SankofaMark`.
- Move to `src/components/ui/`: `NotAvailable`.
- Create in `src/components/layout/`: `PageHeader.tsx`.
- Create in `src/components/ui/`: `Callout.tsx`, `FlashMessage.tsx`, `Field.tsx`, `Button.tsx`, `Pill.tsx`.
- Each component gets a `.test.tsx`. CSS moves in Task 10, so these use the existing global class names for now.

**Interfaces:**
- Produces:
  - `PageHeader({ title, lede?, crumbs? }: { title: string; lede?: ReactNode; crumbs?: { href: string; label: string }[] })`. Renders crumbs `<p>`, `h1.page-title`, `p.page-lede`, with today's markup exactly.
  - `Callout({ children })`.
  - `FlashMessage({ flash }: { flash: Flash | null })`. Renders `p.form-error[role=alert]` for errors and the note style for notes, matching today's markup in the admin pages.
  - `Field({ label, children })`: the `<label>` wrapper.
  - `Button({ variant?: 'primary'|'quiet'|'link', ...button props })`, mapping to `button`, `button button--quiet` and `link-button`.
  - `Pill({ children })`.
- [ ] **Step 1: Failing tests.** Each test renders the component and asserts its role, text and markup:
  - `PageHeader` with crumbs renders the links in order and an `h1` with the title.
  - `FlashMessage` with `{kind:'error'}` has `role="alert"`; with `null` it renders nothing.
  - `Button` with `variant='quiet'` has class `button button--quiet`.
- [ ] **Step 2:** Run. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement each component, and replace the hand-written equivalents in every page.
- [ ] **Step 4:** Run `pnpm check && pnpm e2e && pnpm --filter @gpip/web e2e:visual`. Expected: PASS.
- [ ] **Step 5: Commit** (`refactor(web): shared layout and UI components`).

### Task 6: Feature folders, public read side

For each feature below:
- Create `features/<x>/{components/, server/queries.ts, labels.ts, index.ts}`.
- Move its components, together with their tests.
- Move its loaders out of `lib/data.ts` into `server/queries.ts`, keeping `cache()`.
- Move every label map from pages and components into `labels.ts`, one exported map per concept, `as const`.
- Move pure helpers to the feature root.
- Thin each page: it reads params, calls queries, and renders one feature component, e.g. `CommitmentDetail`, holding the markup the page has today. A `page.tsx` keeps no `className`.

| Feature | Components | Helpers / labels | Routes it serves |
|---|---|---|---|
| `administrations` | `TimelineRibbon` (+ `RibbonLegend`, which goes to its own file `RibbonLegend.tsx`), `AdministrationTimeline`, `LeaderBars` | `timeline.ts` (from `lib/timeline.ts`); `ROLE_LABEL`, `KIND_WORDS`, `FILTERS` | `/`, `/history/administrations[/slug]` |
| `indicators` | `IndicatorChart` (client), `SeriesTable`, `Sparkline` | `chart-model.ts` (from `lib/chart.ts`), `format-value.ts` (from `lib/number.ts`), `csv.ts` (from `lib/csv.ts`) | `/history/indicators[/code]`, `/api/v1/indicators/**` |
| `commitments` | `CommitmentCard`, `KindBadge`, `StatusLabel`, `MoneyList`, `StewardshipTimeline` | `KIND_LABELS`, status labels, `VERIFICATION`, `LINK_WORDS`, money `KINDS` | `/history/commitments[/slug]`, `/history/outstanding` |
| `institutions` | page bodies | `LINEAGE` | `/history/ministries[/slug]` |
| `sources` | page body | `DOCUMENT_TYPES` (was `TYPES`) | `/history/sources` |
| `changes` | page body | `WHAT`, `ACTION` | `/changes` |

**Interfaces:**
- Consumes: `listSectors` (Task 4), via `features/commitments/server/queries.ts` → `loadSectors()`; shared UI (Task 5).
- Produces: each `features/<x>/index.ts` exports its components and labels. `commitments` exports `KindBadge`, `KIND_LABELS` and `STATUS_LABELS`; Task 8's review screens use those.

- [ ] **Step 1: Failing test.**
  - Add to `sectors`-related coverage in `src/features/commitments/commitments-filter.test.ts`: `parseCommitmentFilters(searchParams, sectorSlugs)` keeps `sector` only when it is in `sectorSlugs`.
  - The function is extracted from today's `history/commitments/page.tsx` parsing.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Move the features one at a time, in the table's order**, running `pnpm check` after each.
  - Replace the hard-coded `SECTORS` with `loadSectors()`.
  - The review page's `STATUSES` is left for Task 8.
  - Delete `lib/data.ts`, `lib/timeline.ts`, `lib/chart.ts`, `lib/number.ts` and `lib/csv.ts` once nothing imports them.
- [ ] **Step 4:** Run `pnpm check && pnpm e2e && pnpm --filter @gpip/web e2e:visual`. Expected: PASS.
- [ ] **Step 5: Commit, one commit per feature** (`refactor(web): <x> feature folder`).

### Task 7: Public write side, the error report

**Files:**
- Create: `features/corrections/{components/ReportForm.tsx, server/actions.ts, index.ts}`.
- Move: `app/(public)/report/actions.ts` → `features/corrections/server/actions.ts`.

- [ ] **Step 1:** Move the code. Pages render `ReportForm` and the thanks body.
- [ ] **Step 2:** Run `pnpm e2e` (`corrections.spec.ts` covers it) and the visual suite. Expected: PASS.
- [ ] **Step 3: Commit** (`refactor(web): corrections feature (public report)`).

### Task 8: Admin features

| Feature | Moves | Admin server files |
|---|---|---|
| `corrections` | admin corrections page body → `components/ReportQueue.tsx` | `server/admin-actions.ts` (`setCorrectionStatusAction`), `server/admin-queries.ts` (`loadCorrectionReports`) |
| `review` | queue and item page bodies → `components/ReviewQueue.tsx`, `components/ReviewForm.tsx` | `server/admin-actions.ts` (`approveAction`, `rejectAction`), `server/admin-queries.ts` (`loadReviewQueue`, `loadReviewItem`, `loadReviewCounts`, `loadReviewOptions` → `{ administrations, sectors }` from `listAdministrations` + `listSectors`) |
| `documents` | page body → `components/DocumentsAdmin.tsx`; the file route's logic → `server/admin-queries.ts` (`loadDocumentFile`) | `server/admin-actions.ts` (`archiveAction`, `extractAction`) |

- [ ] **Step 1:** Extend the architecture test's admin-guard expectations: these three features' `admin-*.ts` files exist and pass. Run it. Expected: FAIL until moved.
- [ ] **Step 2: Move.**
  - The review form uses `COMMITMENT_STATUSES` from `@gpip/core` and `STATUS_LABELS` / `KIND_LABELS` from `@/features/commitments`. Delete the page's `STATUSES` and its inline Drizzle queries.
  - Every admin query function calls `await requireEditor()` first. Pages still call it too, per the guard.
  - Delete the interim `app/admin/**/admin-actions.ts` files from Task 3.
- [ ] **Step 3:** Run `pnpm check && pnpm e2e && pnpm --filter @gpip/web e2e:visual`. Expected: PASS.
- [ ] **Step 4: Commit, one per feature** (`refactor(web): <x> admin feature`).

### Task 9: Tighten the architecture test

Add these rules to `RULES`, each with one deliberately bad fixture string checked by a small self-test, so a rule can't pass by matching nothing:
- `no DB outside server`: only files under a `server/` folder import `@gpip/db` or `@gpip/ingest`. `import type` is allowed anywhere.
- `no server in UI`: files under `components/`, `lib/` or a feature's `components/` never import `@/server/` or `/server/`.
- `feature boundaries`: a file in `features/a/` imports `features/b` only as `@/features/b`, never `@/features/b/...`, and never `features/b/server`.
- `thin pages`: `page.tsx` has no `className=`, no top-level `const X = {` or `[` map, and no `drizzle-orm` import.

- [ ] **Step 1:** Add the rules and self-tests. Run. Expected: PASS. If anything fails, fix the code, not the rule.
- [ ] **Step 2: Commit** (`test(web): enforce layer, feature and page rules`).

### Task 10: Styles into tokens, base and component modules

**Files:**
- Create: `src/styles/tokens.css`, which holds the custom properties for light and dark from `globals.css` lines 1–~113.
- Create: `src/styles/base.css`, which holds the reset, typography, `.container`, `.page`, focus styles and the layout utilities `.stack`, `.row`, `.muted`, `.section-title`, `.crumbs`, with selectors unchanged.
- Create: one `Name.module.css` per component that has styles.
- Delete: `src/app/globals.css`. `layout.tsx` imports `tokens.css` and `base.css` instead.

- [ ] **Step 1:** Add the rule `every module has its component` (`X.module.css` needs `X.tsx` beside it). Run it. Expected: PASS (vacuously, guarded by its self-test).
- [ ] **Step 2: Move one component at a time.**
  - Its rules, including their dark-mode and responsive variants, move to its module. Class names become `styles.x`.
  - Data-driven positions become CSS variables (`style={{ '--start': … } as CSSProperties}`).
  - Fold the "Fixes from screenshot review" rules into their owners.
  - Run the visual suite after each component. Expected: PASS.
- [ ] **Step 3:** When `globals.css` is empty apart from tokens and base, delete it. Run `pnpm check && pnpm e2e && pnpm --filter @gpip/web e2e:visual`. Expected: PASS.
- [ ] **Step 4: Commit, per batch of components** (`refactor(web): <x> styles into CSS modules`).

### Task 11: Document it, review, PR

- [ ] **Step 1:** Add an "apps/web structure" section to `AGENTS.md`. It holds the folder map, the "where a file goes" rule, the naming rule, the admin-file rule and `pnpm --filter @gpip/web e2e:visual` (local only). Update the `lib/editors.ts` path mentioned in `playwright.config.ts`.
- [ ] **Step 2:** Run `pnpm check && pnpm build && pnpm e2e && pnpm --filter @gpip/web e2e:visual`. Expected: all pass.
- [ ] **Step 3:** Run `codex review --base main` and one fresh whole-branch review. Fix the findings test-first.
- [ ] **Step 4:** Open the PR (`refactor(web): feature folders, server boundary, CSS modules`). Note that the visual baselines are local-only and are dropped after merge (they're gitignored, so nothing to delete).
