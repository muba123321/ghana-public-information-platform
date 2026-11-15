import { COMMITMENT_KINDS, COMMITMENT_STATUSES } from '@gpip/core';
import type { CommitmentFilters, CommitmentSummary } from '@gpip/db';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import type { CommitmentSearch } from '../commitments-filter';
import { KIND_LABELS, STATUS_LABELS } from '../labels';
import { CommitmentCard } from './CommitmentCard';

type Option = { slug: string; name: string };

interface Props {
  items: CommitmentSummary[];
  /** The query string as sent, to refill the search box. */
  search: CommitmentSearch;
  /** The filters actually applied (unknown values dropped). */
  filters: CommitmentFilters;
  administrations: Option[];
  sectors: Option[];
}

/** The commitment tracker: filters, a count and the matching commitments. */
export function CommitmentTracker({
  items,
  search: sp,
  filters,
  administrations: admins,
  sectors,
}: Props) {
  const filtered = Object.keys(filters).length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Commitment tracker"
        lede="What governments and parties committed to, in their own words, and what happened next — followed across changes of government. Every item links to the page it came from."
      />

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
            {sectors.map(({ slug, name }) => (
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
        <Button>Show</Button>
      </form>

      <p className="muted results-count">
        {items.length} {items.length === 1 ? 'commitment' : 'commitments'}
        {filtered ? ' match these filters' : ' published so far'}
      </p>
      {items.length === 0 ? (
        <Callout>
          {filtered
            ? 'No published commitment matches these filters.'
            : 'Commitments appear here as editors verify them against their source documents.'}
        </Callout>
      ) : (
        <ul className="commitment-list">
          {items.map((c) => (
            <CommitmentCard key={c.slug} c={c} />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
