import { sql } from 'drizzle-orm';
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { editorialColumns } from './editorial.ts';
import { sectors } from './institutions.ts';
import { administrations } from './political.ts';
import { sources } from './sources.ts';

export const estimateType = pgEnum('estimate_type', ['reported', 'modelled', 'projected']);
export const frequency = pgEnum('frequency', ['annual', 'quarterly', 'monthly']);
export const contextEventKind = pgEnum('context_event_kind', [
  'international',
  'methodology',
  'domestic',
  'institutional',
]);

/** The catalogue: what each indicator means and where it comes from. No "good direction". */
export const indicators = pgTable('indicators', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  definition: text('definition').notNull(),
  unit: text('unit').notNull(),
  frequency: frequency('frequency').notNull(),
  sectorSlug: text('sector_slug')
    .notNull()
    .references(() => sectors.slug),
  /** Which importer adapter fetches it (e.g. world-bank-wdi). */
  sourceKey: text('source_key').notNull(),
  /** The publisher's own series code (e.g. FP.CPI.TOTL.ZG). */
  seriesCode: text('series_code').notNull(),
  estimateType: estimateType('estimate_type').notNull(),
  methodology: text('methodology'),
  /** The dataset record shown as this indicator's source. */
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  ...editorialColumns,
});

/** Append-only: a revised publication is a new vintage, never an update. */
export const observations = pgTable(
  'observations',
  {
    id: serial('id').primaryKey(),
    indicatorCode: text('indicator_code')
      .notNull()
      .references(() => indicators.code),
    periodStart: date('period_start', { mode: 'string' }).notNull(),
    periodEnd: date('period_end', { mode: 'string' }).notNull(),
    geography: text('geography').notNull().default('GHA'),
    value: doublePrecision('value'),
    estimateType: estimateType('estimate_type').notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    vintage: date('vintage', { mode: 'string' }).notNull(),
  },
  (t) => [
    unique('observations_natural_key').on(
      t.indicatorCode,
      t.periodStart,
      t.periodEnd,
      t.geography,
      t.sourceId,
      t.vintage,
    ),
    check('observations_period_ordered', sql`${t.periodEnd} > ${t.periodStart}`),
    index('observations_indicator_vintage_idx').on(t.indicatorCode, t.vintage),
  ],
);

/** Targets an administration published for an indicator (target vs actual). */
export const targets = pgTable('targets', {
  id: serial('id').primaryKey(),
  indicatorCode: text('indicator_code')
    .notNull()
    .references(() => indicators.code),
  administrationSlug: text('administration_slug')
    .notNull()
    .references(() => administrations.slug),
  periodStart: date('period_start', { mode: 'string' }).notNull(),
  periodEnd: date('period_end', { mode: 'string' }).notNull(),
  value: doublePrecision('value').notNull(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  ...editorialColumns,
});

/** Dated facts shown on charts for context — never an explanation of cause. */
export const contextEvents = pgTable('context_events', {
  id: serial('id').primaryKey(),
  date: date('date', { mode: 'string' }).notNull(),
  title: text('title').notNull(),
  kind: contextEventKind('kind').notNull(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  ...editorialColumns,
});

export const importRuns = pgTable('import_runs', {
  id: serial('id').primaryKey(),
  sourceKey: text('source_key').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: text('status', { enum: ['running', 'ok', 'failed'] })
    .notNull()
    .default('running'),
  indicatorsChecked: integer('indicators_checked').notNull().default(0),
  vintagesWritten: integer('vintages_written').notNull().default(0),
  error: text('error'),
});
