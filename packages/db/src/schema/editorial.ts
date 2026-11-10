import { text, timestamp } from 'drizzle-orm/pg-core';
import { provenance, reviewStatus } from './enums.ts';

/** Columns shared by every record that passes through editorial review. */
export const editorialColumns = {
  reviewStatus: reviewStatus('review_status').notNull().default('draft'),
  provenance: provenance('provenance').notNull(),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};
