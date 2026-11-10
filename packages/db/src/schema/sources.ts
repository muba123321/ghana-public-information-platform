import { date, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { sourceType } from './enums.js';

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publisher: text('publisher').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    sourceType: sourceType('source_type').notNull(),
    publishedOn: date('published_on', { mode: 'string' }),
    retrievedOn: date('retrieved_on', { mode: 'string' }).notNull(),
    licence: text('licence'),
    archiveKey: text('archive_key'),
    sha256: text('sha256'),
  },
  (t) => [unique('sources_url_title_unique').on(t.url, t.title)],
);
