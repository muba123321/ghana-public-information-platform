import {
  COMMITMENT_KINDS,
  COMMITMENT_STATUSES,
  type CommitmentKind,
  type CommitmentStatus,
} from '@gpip/core';
import type { Metadata } from 'next';
import { CommitmentCard } from '../../../components/CommitmentCard';
import { KIND_LABELS } from '../../../components/KindBadge';
import { STATUS_LABELS } from '../../../components/StatusLabel';
import { loadAdministrations, loadCommitments } from '../../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Commitment tracker' };

type Search = {
  administration?: string;
  sector?: string;
  kind?: string;
  status?: string;
  q?: string;
};
type Props = { searchParams: Promise<Search> };

const SECTORS = [
  ['economy', 'Economy'],
  ['agriculture', 'Agriculture'],
  ['education', 'Education'],
  ['health', 'Health'],
  ['infrastructure', 'Infrastructure'],
  ['social-development', 'Social development'],
] as const;

const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) =>
  allowed.find((a) => a === v);

export default async function CommitmentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const admins = await loadAdministrations();
  const filters = {
    ...(admins.some((a) => a.slug === sp.administration)
      ? { administration: sp.administration }
      : {}),
    ...(pick(
      sp.sector,
      SECTORS.map(([s]) => s),
    )
      ? { sector: sp.sector }
      : {}),
    ...(pick(sp.kind, COMMITMENT_KINDS) ? { kind: sp.kind as CommitmentKind } : {}),
    ...(pick(sp.status, COMMITMENT_STATUSES) ? { status: sp.status as CommitmentStatus } : {}),
    ...(sp.q?.trim() ? { q: sp.q.trim().slice(0, 100) } : {}),
  };
  const items = await loadCommitments(filters);
  const filtered = Object.keys(filters).length > 0;

  return (
    <div className="container page">
      <h1 className="page-title">Commitment tracker</h1>
      <p className="page-lede">
        What governments and parties committed to, in their own words, and what happened next —
        followed across changes of government. Every item links to the page it came from.
      </p>

      <form className="filters-form" method="get">
        <label>
          Search wording
          <input name="q" defaultValue={sp.q ?? ''} placeholder="e.g. hospital, road, school" />
        </label>
        <label>
          Government
          <select name="administration" defaultValue={filters.administration ?? ''}>
            <option value="">Any</option>
            {admins.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sector
          <select name="sector" defaultValue={filters.sector ?? ''}>
            <option value="">Any</option>
            {SECTORS.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kind
          <select name="kind" defaultValue={filters.kind ?? ''}>
            <option value="">Any</option>
            {COMMITMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={filters.status ?? ''}>
            <option value="">Any</option>
            {COMMITMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button">
          Show
        </button>
      </form>

      <p className="muted results-count">
        {items.length} {items.length === 1 ? 'commitment' : 'commitments'}
        {filtered ? ' match these filters' : ' published so far'}
      </p>
      {items.length === 0 ? (
        <p className="callout">
          {filtered
            ? 'No published commitment matches these filters.'
            : 'Commitments appear here as editors verify them against their source documents.'}
        </p>
      ) : (
        <ul className="commitment-list">
          {items.map((c) => (
            <CommitmentCard key={c.slug} c={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
