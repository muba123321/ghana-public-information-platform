import type { Tenure } from './tenure.ts';

export const COMMITMENT_KINDS = [
  'campaign_promise',
  'policy_statement',
  'approved_programme',
  'funded_project',
] as const;
export const COMMITMENT_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
  'partially_completed',
  'stalled',
  'discontinued',
  'superseded',
  'insufficient_evidence',
] as const;
export const VERIFICATIONS = ['government_reported', 'independently_verified', 'disputed'] as const;
export const CURRENCIES = ['GHS', 'GHC', 'USD'] as const;

/** A manifesto line is not a funded project: the kind is always shown and never merged. */
export type CommitmentKind = (typeof COMMITMENT_KINDS)[number];
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];
export type Verification = (typeof VERIFICATIONS)[number];
/** GHC = old cedi (before the 1 July 2007 redenomination), GHS = Ghana cedi. */
export type Currency = (typeof CURRENCIES)[number];

/** One administration's custody of a commitment, with progress (0–100) when it took over and left. */
export interface StewardshipInput {
  administrationSlug: string;
  progressAtStart: number | null;
  progressAtEnd: number | null;
}

const inRange = (v: number | null) => v === null || (v >= 0 && v <= 100);

/**
 * Checks that a commitment's history is continuous: it starts with the government that made it and
 * passes to each following government in turn. Returns readable problems; [] means valid.
 */
export function validateStewardshipChain(
  chain: readonly StewardshipInput[],
  originating: string,
  timeline: readonly Tenure[],
): string[] {
  if (chain.length === 0) return ['A commitment needs at least one administration.'];
  const problems: string[] = [];
  const index = new Map(timeline.map((t, i) => [t.slug, i]));

  for (const link of chain) {
    if (!index.has(link.administrationSlug))
      problems.push(`unknown administration ${link.administrationSlug}`);
    if (!inRange(link.progressAtStart))
      problems.push(`${link.administrationSlug}: progress at start must be between 0 and 100`);
    if (!inRange(link.progressAtEnd))
      problems.push(`${link.administrationSlug}: progress at end must be between 0 and 100`);
  }
  if (problems.some((p) => p.startsWith('unknown'))) return problems;

  if (chain[0]?.administrationSlug !== originating) {
    problems.push(`The history must start with the originating administration (${originating}).`);
  }
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const next = chain[i];
    if (!prev || !next) continue;
    const a = index.get(prev.administrationSlug) ?? -1;
    const b = index.get(next.administrationSlug) ?? -1;
    if (b <= a) {
      problems.push(`${next.administrationSlug} must come after ${prev.administrationSlug}.`);
      continue;
    }
    for (let k = a + 1; k < b; k++) {
      problems.push(
        `${timeline[k]?.slug} is missing between ${prev.administrationSlug} and ${next.administrationSlug}.`,
      );
    }
    if (
      prev.progressAtEnd !== null &&
      next.progressAtStart !== null &&
      prev.progressAtEnd !== next.progressAtStart
    ) {
      problems.push(
        `${next.administrationSlug} starts at ${next.progressAtStart}% but ${prev.administrationSlug} ended at ${prev.progressAtEnd}%.`,
      );
    }
  }
  return problems;
}

/** Each administration's own share of progress — the finisher is never credited with the whole. */
export function contributions(
  chain: readonly StewardshipInput[],
): { administrationSlug: string; delta: number | null }[] {
  return chain.map((l) => ({
    administrationSlug: l.administrationSlug,
    delta:
      l.progressAtStart === null || l.progressAtEnd === null
        ? null
        : l.progressAtEnd - l.progressAtStart,
  }));
}

/** Totals per currency; amounts in different currencies are never added together. */
export function totalsByCurrency(
  amounts: readonly { amount: number; currency: Currency }[],
): Partial<Record<Currency, number>> {
  const totals: Partial<Record<Currency, number>> = {};
  for (const { amount, currency } of amounts) totals[currency] = (totals[currency] ?? 0) + amount;
  return totals;
}
