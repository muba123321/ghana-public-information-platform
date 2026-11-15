import type { CommitmentKind, CommitmentStatus } from '@gpip/core';

export const KIND_LABELS: Record<CommitmentKind, string> = {
  campaign_promise: 'Campaign promise',
  policy_statement: 'Policy statement',
  approved_programme: 'Approved programme',
  funded_project: 'Funded project',
};

/** Descriptive, never judgemental: no "broken", "failed" or "kept". */
export const STATUS_LABELS: Record<CommitmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  partially_completed: 'Partly completed',
  stalled: 'Stalled',
  discontinued: 'Discontinued',
  superseded: 'Replaced by a later commitment',
  insufficient_evidence: 'Not enough evidence published',
};

/** Budget stages, in the order money moves. */
export const BUDGET_STAGE_LABELS = [
  ['allocated', 'Allocated'],
  ['released', 'Released'],
  ['spent', 'Spent'],
] as const;

export const VERIFICATION_LABELS = {
  government_reported: 'Reported by government',
  independently_verified: 'Independently verified',
  disputed: 'Disputed',
} as const;

/** How one commitment relates to another it links to. */
export const COMMITMENT_LINK_LABELS = {
  supersedes: 'Replaces',
  continues: 'Continues',
  duplicates: 'Same as',
} as const;
