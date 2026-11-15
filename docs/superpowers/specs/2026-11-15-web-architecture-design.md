# Web app architecture: clear layers, feature folders, scoped styles

Date: 2026-11-15 · Status: for owner approval (builder check done) · Branch: `refactor/web-architecture`

## Why

The site works, but its layout doesn't say what it is. The owner can't tell which code runs in
the browser and which runs on the server. Styling, labels and helpers live wherever they were
first needed, and some are written twice. The goal is a structure a new contributor can read at a
glance. Everything has one home and is reused, nothing is written twice, and new features (Plan 4
Compare, later modules) slot in without the project getting messier.

## What exists today (on `main` at b424161)

- `packages/core` (pure rules), `packages/db` (the only SQL), `packages/ingest` (importers,
  archive, AI extraction). These are already the backend core and stay as they are.
- `apps/web`:
  - `app/`: 30 route files. 10 of them import `@gpip/db` directly, and
    `admin/review/[slug]/page.tsx` writes its own Drizzle queries. Public pages instead go
    through `lib/data.ts`.
  - `components/`: 15 components in one flat folder, used by different features.
  - `lib/`: 14 files that mix server-only code (`db`, `admin`, `editors`, `flash`, `files`,
    `sender`, `shutdown`, `data`, `api`) with pure helpers (`format`, `number`, `chart`,
    `timeline`, `csv`). Nothing stops browser code importing the server files.
  - `app/globals.css`: 1,385 lines for every page, ending in a "Fixes from screenshot review"
    section. 283 `className` uses. Inline `style` appears only 4 times, all for computed bar
    positions, which is legitimate.
- Duplication:
  - Commitment statuses: in `core`, and again in the review page.
  - The sector list is hard-coded in `history/commitments/page.tsx` (sectors are a DB table).
  - About 12 display-label maps scattered across pages and components (`WHAT`, `ACTION`,
    `LINEAGE`, `VERIFICATION`, `LINK_WORDS`, `TYPES`, `KIND_WORDS`, `ROLE_LABEL`, `KINDS`…).
  - Date arithmetic (`monthsBetween`, `fullYearsBetween`) sits in `web/lib/format.ts`, next to
    `core/period.ts`.
  - Page scaffolding (container, title, lede, crumbs, flash message, form fields) is repeated by
    hand in every page.

## Goals

1. **Frontend and backend visibly separate**, and enforced, not just by convention.
2. **Feature folders:** everything about commitments (its components, labels, server queries,
   actions) sits together; shared UI sits in one place.
3. **Scoped styles:** each component owns its CSS. Global CSS is limited to design tokens and
   base typography and layout.
4. **No duplication:** one definition for every constant, label map, rule and helper.
5. **Consistent naming** that a linter or test can check.

## Non-goals

- No visual redesign. Pages must look the same, pixel for pixel within tolerance.
- No behaviour, URL, API or data changes. No new features.
- `packages/*` keep their names and boundaries. Only small additions to `db` (queries the pages
  currently write themselves) and `core` (date arithmetic moved from web).
- No new styling framework (Tailwind etc.). That would be a redesign-sized rewrite.

## Anti-goals (failure even if it "works")

- Any page looks different, any test is deleted to make the move easier, or any public URL breaks.
- A structure so layered that adding a small feature means touching 8 files.

## Approaches considered

- **A — One Next.js app, clearly layered by feature** ✅ *(owner picked)*. One deployment, fast
  server rendering. The separation is enforced by folder rules, Next's `server-only` guard and an
  architecture test.
- **B — Separate backend API service** that the site calls over HTTP. Strictest split, but two
  deployments, slower pages, and types maintained twice. Rejected.

## Design

### Folder layout (`apps/web`)

```
apps/web/
  src/
    app/                      ← ROUTES ONLY. Thin: read params, call a feature's server
      (public)/…               queries, render the feature's components. No SQL, no label
      admin/…                  maps, no CSS files.
      api/…
      layout.tsx
    features/                 ← one folder per domain area
      administrations/
      indicators/
      commitments/
      institutions/           (ministries)
      sources/
      changes/
      corrections/            (public report form + admin error reports)
      review/                 (admin review queue)
      documents/              (admin archive and extraction)
        components/           ← UI. Each component: Name.tsx + Name.module.css (+ Name.test.tsx)
        server/               ← BACKEND. queries.ts, actions.ts (+ admin-queries.ts, admin-actions.ts).
                                First line `import 'server-only'`
        index.ts              ← the feature's browser-safe public API (components, labels, helpers)
        labels.ts             ← this feature's display words (one map per concept)
        *.ts                  ← pure feature helpers (e.g. timeline maths), browser-safe
    components/               ← shared UI used by 2+ features
      layout/                 SiteHeader, SiteFooter, SankofaMark, PageHeader, Crumbs
      ui/                     Badge, Pill, Callout, NotAvailable, FlashMessage, Field, Button…
    server/                   ← shared BACKEND infrastructure, all `import 'server-only'`
      db.ts  auth.ts  editors.ts  flash.ts  files.ts  sender.ts  shutdown.ts  api.ts
    lib/                      ← shared browser-safe pure helpers: format.ts, number.ts, csv.ts
    styles/
      tokens.css              colours, type scale, spacing, radii (light and dark)
      base.css                reset, typography, .container, focus styles
  e2e/                        (unchanged location)
```

- `auth.ts` and `instrumentation.ts` stay where Next requires them; `auth.ts` re-exports from
  `src/server/auth.ts`.
- Next supports `src/` natively. The `@/*` path alias maps to `src/*`, so imports read
  `@/features/commitments/...` instead of `../../../../`.

**Where a file goes (the one rule a contributor needs):**
- Talks to the database, auth, cookies or secrets → `server/` (feature or shared).
- Renders UI → `components/` (feature, or shared if two or more features use it).
- Pure logic with no I/O → the feature root, or `lib/` if shared, or `packages/core` if it is a
  domain rule.

### Frontend and backend boundary: enforced three ways

1. `server-only` (Next's official package) at the top of every `server/` file. A browser import
   fails the build.
2. **Architecture test** (Vitest, no new tool), extending the existing `admin/guard.test.ts`
   idea. It scans imports and fails when:
   - anything outside a `server/` folder imports `@gpip/db` or `@gpip/ingest` (type-only
     imports allowed);
   - `components/` or `lib/` import from `server/`;
   - a feature imports another feature's `server/` folder, or reaches past another feature's
     `index.ts` (see "Using one feature from another" below);
   - a file breaks the naming rule below;
   - a `.module.css` file has no matching component.
3. **Pages stay thin:** the same test fails when a `page.tsx` defines a top-level constant map or
   imports from `drizzle`.

### Using one feature from another *(builder check; my call)*

- Each feature has an `index.ts` that exports its browser-safe public parts: components, labels
  and pure helpers. Its `server/` folder is never exported there.
- **Route pages in `app/` may compose any feature's public parts.** That is their job. For
  example, a ministry page shows `CommitmentCard` from `@/features/commitments`.
- **A feature may use another feature's public parts only through its `index.ts`.** For example,
  `review` uses `KindBadge` and the status labels from `@/features/commitments`. It never deep
  imports, and never imports another feature's server code. If a feature needs another feature's
  data, its page loads it.
- Shared `components/` is only for domain-free UI: layout, badge shell, callout, form field.
  Commitment-specific UI stays with commitments, even when four pages show it.

### Admin access guard *(builder check; my call)*

- Admin-only code is kept apart from public code, inside each feature:
  - `server/actions.ts` and `server/queries.ts` hold public code;
  - `server/admin-actions.ts` and `server/admin-queries.ts` hold editor-only code.
  - Admin route pages stay under `app/admin/`.
- The architecture test checks **every exported function** in `admin-*.ts` files, and every
  `page.tsx` and `route.ts` under `app/admin/`. Each must call `await requireEditor()` (or
  `currentEditor()` for the file route). A file passing because one function checks is no longer
  enough.
- One named exemption: `signOutAction`, which moves to `src/server/auth-actions.ts`.

The existing `app/admin/guard.test.ts` is replaced by this stricter rule.

### Styling

- Each component gets `Name.module.css`. Its class names become local (`styles.card`), so no
  more global name collisions and no more "fixes" section.
- `styles/tokens.css` keeps the "Sankofa" design tokens (CSS custom properties, light and dark)
  exactly as today. `styles/base.css` keeps the reset, typography and `.container`.
- The 4 computed inline styles stay (they are data-driven positions), passed as CSS variables
  (`style={{ '--x': … }}`) so the rules themselves live in the module.
- **Proof of no visual change** *(builder check; my call)*:
  - Before moving anything, add a separate Playwright project, `pnpm e2e:visual`. It screenshots
    every public and admin page at desktop and phone width, in light and dark mode, on the
    current `main`.
  - It runs locally on the Mac where the baselines are made, and is **not** part of CI. Linux font
    rendering differs, so a CI version would fail on fonts, not layout.
  - Every step in this refactor must pass it. Normal `pnpm e2e` stays in CI unchanged.
  - Once the refactor is merged, the baselines are deleted: they guard this refactor, not future
    redesigns.

### Reuse and de-duplication (each becomes one definition)

| Today | Becomes |
|---|---|
| `STATUSES` in review page | `COMMITMENT_STATUSES` from `@gpip/core` |
| Hard-coded `SECTORS` in commitments page | `listSectors(db)` in `@gpip/db`, via the feature's server queries. Sorted by name *(my call: neutral and predictable, and the closed dropdown looks the same)*. The filter accepts any sector in the table. |
| Review page's own Drizzle queries | `listAdministrationOptions`, `listSectors` repositories in `@gpip/db` |
| ~12 scattered label maps | one `labels.ts` per feature; commitment kind and status labels live once in `features/commitments/labels.ts` |
| `monthsBetween` / `fullYearsBetween` in web | `@gpip/core/period.ts` (pure date maths, tested there); web keeps only the wording |
| Repeated page scaffolding | `PageHeader` (title, lede, crumbs), `FlashMessage`, `Field` components |
| `lib/data.ts` grab-bag of loaders | each feature's `server/queries.ts` (keeps React `cache()`) |

### Naming

- React component files: `PascalCase.tsx`, named after their single exported component;
  stylesheet `PascalCase.module.css`; test `PascalCase.test.tsx` next to it.
- Every other file and folder: `kebab-case` (`queries.ts`, `stewardship-chain.ts`).
- Next's reserved names (`page.tsx`, `layout.tsx`, `route.ts`, `actions.ts`…) as Next requires.
- Server actions live in `features/<x>/server/actions.ts` with `'use server'`.

### Docs

- `AGENTS.md` gets an "apps/web structure" section with the folder map, the "where a file goes"
  rule and the naming rule, so Codex and future contributors follow it.

## How it gets done (for the plan)

One branch and one PR, in small commits that each keep `pnpm check` and `pnpm e2e` green:
1. Screenshot baseline on current code.
2. Move to `src/` and add the `@/` alias (moves only).
3. Shared `server/` with `server-only`, plus the architecture test (ratchet: start with rules
   that pass, then tighten each rule as its step lands).
4. Feature folders, one feature at a time: move components, queries, actions, labels; thin the
   pages.
5. New `db` repositories and `core` date maths; delete the duplicates.
6. CSS: tokens and base, then one component at a time into modules; screenshots must match.
   Delete `globals.css` last.
7. Shared UI components (`PageHeader`, `FlashMessage`, `Field`…) replace hand-written repeats.
8. `AGENTS.md` update; Codex review and a fresh review; PR.

## Left to the builder

- Exact split of shared `components/ui` (which small pieces earn a component).
- Screenshot tolerance (start at Playwright's default; loosen only for anti-aliasing, never
  layout).
- The order of features in step 4 (suggest: smallest first, to settle the pattern).
