import { bigserial, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Append-only record of every published change; exposed publicly as the corrections log. */
export const changeLog = pgTable('change_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  entityTable: text('entity_table').notNull(),
  entityKey: text('entity_key').notNull(),
  action: text('action', { enum: ['insert', 'update', 'delete'] }).notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  changedBy: text('changed_by').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});
