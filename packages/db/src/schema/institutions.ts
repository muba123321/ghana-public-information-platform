import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, serial, text, uuid } from 'drizzle-orm/pg-core';
import { editorialColumns } from './editorial.ts';
import { lineageKind } from './enums.ts';
import { sources } from './sources.ts';

export const sectors = pgTable('sectors', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
});

/** Stable identity of a ministry/agency across renames and reorganisations. */
export const institutions = pgTable('institutions', {
  slug: text('slug').primaryKey(),
  kind: text('kind').notNull(),
});

export const institutionVersions = pgTable(
  'institution_versions',
  {
    id: serial('id').primaryKey(),
    institutionSlug: text('institution_slug')
      .notNull()
      .references(() => institutions.slug),
    name: text('name').notNull(),
    mandate: text('mandate'),
    parentSlug: text('parent_slug').references(() => institutions.slug),
    sectorSlug: text('sector_slug').references(() => sectors.slug),
    validFrom: date('valid_from', { mode: 'string' }).notNull(),
    validTo: date('valid_to', { mode: 'string' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    ...editorialColumns,
  },
  (t) => [
    check('versions_dates_ordered', sql`${t.validTo} is null or ${t.validTo} > ${t.validFrom}`),
    index('versions_institution_idx').on(t.institutionSlug),
  ],
);

export const institutionLineage = pgTable('institution_lineage', {
  id: serial('id').primaryKey(),
  fromSlug: text('from_slug')
    .notNull()
    .references(() => institutions.slug),
  toSlug: text('to_slug')
    .notNull()
    .references(() => institutions.slug),
  kind: lineageKind('kind').notNull(),
  effectiveOn: date('effective_on', { mode: 'string' }).notNull(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => sources.id),
});
