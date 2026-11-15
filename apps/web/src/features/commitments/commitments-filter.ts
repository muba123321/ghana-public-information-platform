import {
  COMMITMENT_KINDS,
  COMMITMENT_STATUSES,
  type CommitmentKind,
  type CommitmentStatus,
} from '@gpip/core';
import type { CommitmentFilters } from '@gpip/db';

/** The tracker's query string, as the browser sends it. */
export type CommitmentSearch = {
  administration?: string;
  sector?: string;
  kind?: string;
  status?: string;
  q?: string;
};

const pick = <T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined =>
  allowed.find((a) => a === v);

/** Only filters that name something real reach the database; anything else is ignored. */
export function parseCommitmentFilters(
  search: CommitmentSearch,
  known: { administrations: readonly string[]; sectors: readonly string[] },
): CommitmentFilters {
  const administration = pick(search.administration, known.administrations);
  const sector = pick(search.sector, known.sectors);
  const kind: CommitmentKind | undefined = pick(search.kind, COMMITMENT_KINDS);
  const status: CommitmentStatus | undefined = pick(search.status, COMMITMENT_STATUSES);
  const q = search.q?.trim().slice(0, 100);
  return {
    ...(administration ? { administration } : {}),
    ...(sector ? { sector } : {}),
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
  };
}
