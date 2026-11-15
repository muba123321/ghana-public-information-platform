import type { CorrectionStatus } from '@gpip/db';

/** What an editor can decide about an error report ("new" is only ever set on arrival). */
export const CORRECTION_OUTCOMES = [
  'reviewed',
  'actioned',
  'dismissed',
] as const satisfies readonly CorrectionStatus[];

export type CorrectionOutcome = (typeof CORRECTION_OUTCOMES)[number];

export const isCorrectionOutcome = (v: string): v is CorrectionOutcome =>
  (CORRECTION_OUTCOMES as readonly string[]).includes(v);
