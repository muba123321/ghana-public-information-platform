import { sql } from 'drizzle-orm';
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { editorialColumns } from './editorial.ts';
import { estimateType, indicators } from './indicators.ts';
import { sources } from './sources.ts';

/**
 * Every region that has existed in our records: the 16 current regions and the 4 former regions
 * split in 2019. valid_from is null for regions that already existed before our earliest regional
 * figures (1988); valid_to is set on regions that no longer exist.
 */
export const regions = pgTable('regions', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  capital: text('capital'),
  validFrom: date('valid_from', { mode: 'string' }),
  validTo: date('valid_to', { mode: 'string' }),
  /** North-to-south position, for lists and map colours (never a ranking). */
  displayOrder: integer('display_order').notNull(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
  ...editorialColumns,
});

/** How the former regions became current ones (the 2019 split), with the instrument that did it. */
export const regionLineage = pgTable(
  'region_lineage',
  {
    id: serial('id').primaryKey(),
    fromSlug: text('from_slug')
      .notNull()
      .references(() => regions.slug),
    toSlug: text('to_slug')
      .notNull()
      .references(() => regions.slug),
    effectiveOn: date('effective_on', { mode: 'string' }).notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
  },
  (t) => [unique('region_lineage_pair').on(t.fromSlug, t.toSlug)],
);

/**
 * Regional figures. measured_for_region_slug is the geography the figure actually describes (a 2014
 * survey describes the former Northern Region, not Savannah) — figures are never re-attributed.
 */
export const regionObservations = pgTable(
  'region_observations',
  {
    id: serial('id').primaryKey(),
    indicatorCode: text('indicator_code')
      .notNull()
      .references(() => indicators.code),
    regionSlug: text('region_slug')
      .notNull()
      .references(() => regions.slug),
    measuredForRegionSlug: text('measured_for_region_slug')
      .notNull()
      .references(() => regions.slug),
    periodStart: date('period_start', { mode: 'string' }).notNull(),
    periodEnd: date('period_end', { mode: 'string' }).notNull(),
    value: doublePrecision('value'),
    estimateType: estimateType('estimate_type').notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    vintage: date('vintage', { mode: 'string' }).notNull(),
  },
  (t) => [
    unique('region_observations_natural_key').on(
      t.indicatorCode,
      t.measuredForRegionSlug,
      t.periodStart,
      t.sourceId,
      t.vintage,
    ),
    check('region_observations_period_ordered', sql`${t.periodEnd} > ${t.periodStart}`),
    index('region_observations_region_idx').on(t.regionSlug, t.indicatorCode),
  ],
);
