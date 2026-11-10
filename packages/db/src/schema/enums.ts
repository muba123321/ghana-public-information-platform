import { pgEnum } from 'drizzle-orm/pg-core';

export const reviewStatus = pgEnum('review_status', [
  'draft',
  'in_review',
  'published',
  'rejected',
]);
export const provenance = pgEnum('provenance', ['api', 'table_import', 'ai_extracted', 'manual']);
export const administrationKind = pgEnum('administration_kind', [
  'civilian',
  'military',
  'transitional',
]);
export const leaderRole = pgEnum('leader_role', [
  'head_of_state',
  'head_of_government',
  'vice_president',
]);
export const sourceType = pgEnum('source_type', [
  'official_website',
  'statute',
  'gazette',
  'report',
  'dataset',
  'manifesto',
  'budget_statement',
  'development_plan',
  'reference_work',
]);
export const lineageKind = pgEnum('lineage_kind', [
  'renamed',
  'merged_into',
  'split_from',
  'replaced_by',
  'absorbed_functions_of',
]);
