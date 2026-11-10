import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, serial, text, unique, uuid } from 'drizzle-orm/pg-core';
import { editorialColumns } from './editorial.ts';
import { administrationKind, leaderRole } from './enums.ts';
import { sources } from './sources.ts';

export const parties = pgTable('parties', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
});

export const persons = pgTable('persons', {
  slug: text('slug').primaryKey(),
  fullName: text('full_name').notNull(),
});

export const administrations = pgTable(
  'administrations',
  {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    kind: administrationKind('kind').notNull(),
    partySlug: text('party_slug').references(() => parties.slug),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
    notes: text('notes'),
    ...editorialColumns,
  },
  (t) => [
    check(
      'administrations_dates_ordered',
      sql`${t.endDate} is null or ${t.endDate} > ${t.startDate}`,
    ),
    index('administrations_start_idx').on(t.startDate),
  ],
);

export const administrationLeaders = pgTable(
  'administration_leaders',
  {
    id: serial('id').primaryKey(),
    administrationSlug: text('administration_slug')
      .notNull()
      .references(() => administrations.slug, { onDelete: 'cascade' }),
    personSlug: text('person_slug')
      .notNull()
      .references(() => persons.slug),
    role: leaderRole('role').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    label: text('label'),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id),
  },
  (t) => [
    check('leaders_dates_ordered', sql`${t.endDate} is null or ${t.endDate} > ${t.startDate}`),
    index('leaders_admin_idx').on(t.administrationSlug),
    index('leaders_person_idx').on(t.personSlug),
    unique('leaders_natural_key').on(t.administrationSlug, t.personSlug, t.role, t.startDate),
  ],
);
