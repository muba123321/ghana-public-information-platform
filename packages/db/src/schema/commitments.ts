import { COMMITMENT_KINDS, COMMITMENT_STATUSES, CURRENCIES, VERIFICATIONS } from '@gpip/core';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { editorialColumns } from './editorial.ts';
import { institutions, sectors } from './institutions.ts';
import { administrations } from './political.ts';
import { sources } from './sources.ts';

export const commitmentKind = pgEnum('commitment_kind', COMMITMENT_KINDS);
export const commitmentStatus = pgEnum('commitment_status', COMMITMENT_STATUSES);
export const verification = pgEnum('verification', VERIFICATIONS);
export const currency = pgEnum('currency', CURRENCIES);
export const budgetKind = pgEnum('budget_kind', ['allocated', 'released', 'spent']);
export const commitmentLinkKind = pgEnum('commitment_link_kind', [
  'supersedes',
  'continues',
  'duplicates',
]);
export const editorialNoteKind = pgEnum('editorial_note_kind', [
  'context',
  'unresolved_question',
  'timeline_narrative',
]);
export const correctionStatus = pgEnum('correction_status', [
  'new',
  'reviewed',
  'actioned',
  'dismissed',
]);

/** An archived original (manifesto, budget statement, plan). Private unless its licence allows sharing. */
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  title: text('title').notNull(),
  docType: text('doc_type').notNull(),
  administrationSlug: text('administration_slug').references(() => administrations.slug),
  pages: integer('pages'),
  mime: text('mime').notNull(),
  sha256: text('sha256').notNull().unique(),
  storageKey: text('storage_key').notNull(),
  bytes: integer('bytes').notNull(),
  publicRedistribution: boolean('public_redistribution').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }).notNull().defaultNow(),
});

export const commitments = pgTable(
  'commitments',
  {
    slug: text('slug').primaryKey(),
    /** Verbatim from the source document. */
    wording: text('wording').notNull(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id),
    page: integer('page').notNull(),
    kind: commitmentKind('kind').notNull(),
    originatingAdministrationSlug: text('originating_administration_slug')
      .notNull()
      .references(() => administrations.slug),
    announcedOn: date('announced_on', { mode: 'string' }),
    sectorSlug: text('sector_slug').references(() => sectors.slug),
    target: text('target'),
    targetDeadline: date('target_deadline', { mode: 'string' }),
    finalStatus: commitmentStatus('final_status').notNull().default('not_started'),
    ...editorialColumns,
  },
  (t) => [
    check('commitments_page_positive', sql`${t.page} >= 1`),
    index('commitments_origin_idx').on(t.originatingAdministrationSlug),
  ],
);

export const commitmentInstitutions = pgTable(
  'commitment_institutions',
  {
    commitmentSlug: text('commitment_slug')
      .notNull()
      .references(() => commitments.slug, { onDelete: 'cascade' }),
    institutionSlug: text('institution_slug')
      .notNull()
      .references(() => institutions.slug),
  },
  (t) => [primaryKey({ columns: [t.commitmentSlug, t.institutionSlug] })],
);

/** Money is stored in its own currency and never converted or mixed. */
export const commitmentBudgets = pgTable('commitment_budgets', {
  id: serial('id').primaryKey(),
  commitmentSlug: text('commitment_slug')
    .notNull()
    .references(() => commitments.slug, { onDelete: 'cascade' }),
  kind: budgetKind('kind').notNull(),
  amount: numeric('amount', { mode: 'number' }).notNull(),
  currency: currency('currency').notNull(),
  fiscalYear: integer('fiscal_year'),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  page: integer('page'),
  ...editorialColumns,
});

/** One row per administration that held the commitment — each keeps its own share of progress. */
export const commitmentStewardships = pgTable(
  'commitment_stewardships',
  {
    id: serial('id').primaryKey(),
    commitmentSlug: text('commitment_slug')
      .notNull()
      .references(() => commitments.slug, { onDelete: 'cascade' }),
    administrationSlug: text('administration_slug')
      .notNull()
      .references(() => administrations.slug),
    progressAtStart: doublePrecision('progress_at_start'),
    progressAtEnd: doublePrecision('progress_at_end'),
    status: commitmentStatus('status').notNull(),
    notes: text('notes'),
  },
  (t) => [
    unique('stewardship_once_per_administration').on(t.commitmentSlug, t.administrationSlug),
    check(
      'stewardship_progress_range',
      sql`(${t.progressAtStart} is null or ${t.progressAtStart} between 0 and 100) and (${t.progressAtEnd} is null or ${t.progressAtEnd} between 0 and 100)`,
    ),
  ],
);

export const progressUpdates = pgTable('progress_updates', {
  id: serial('id').primaryKey(),
  commitmentSlug: text('commitment_slug')
    .notNull()
    .references(() => commitments.slug, { onDelete: 'cascade' }),
  date: date('date', { mode: 'string' }).notNull(),
  description: text('description').notNull(),
  metricValue: doublePrecision('metric_value'),
  verification: verification('verification').notNull(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  page: integer('page'),
  ...editorialColumns,
});

export const commitmentLinks = pgTable(
  'commitment_links',
  {
    fromSlug: text('from_slug')
      .notNull()
      .references(() => commitments.slug, { onDelete: 'cascade' }),
    toSlug: text('to_slug')
      .notNull()
      .references(() => commitments.slug, { onDelete: 'cascade' }),
    kind: commitmentLinkKind('kind').notNull(),
  },
  (t) => [primaryKey({ columns: [t.fromSlug, t.toSlug, t.kind] })],
);

/** Editorial prose (context, unresolved questions) — reviewed like any other record. */
export const editorialNotes = pgTable('editorial_notes', {
  id: serial('id').primaryKey(),
  subjectType: text('subject_type', {
    enum: ['commitment', 'administration', 'indicator'],
  }).notNull(),
  subjectKey: text('subject_key').notNull(),
  kind: editorialNoteKind('kind').notNull(),
  body: text('body').notNull(),
  sourceId: uuid('source_id').references(() => sources.id),
  ...editorialColumns,
});

export const extractionRuns = pgTable('extraction_runs', {
  id: serial('id').primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  status: text('status', { enum: ['running', 'ok', 'failed'] })
    .notNull()
    .default('running'),
  itemsFound: integer('items_found').notNull().default(0),
  itemsQueued: integer('items_queued').notNull().default(0),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  costUsd: numeric('cost_usd', { mode: 'number' }),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

/** Public "report an error" submissions. Never published automatically; the IP is stored only as a salted hash. */
export const correctionReports = pgTable('correction_reports', {
  id: serial('id').primaryKey(),
  pageUrl: text('page_url').notNull(),
  message: text('message').notNull(),
  evidenceUrl: text('evidence_url'),
  contact: text('contact'),
  ipHash: text('ip_hash').notNull(),
  status: correctionStatus('status').notNull().default('new'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
