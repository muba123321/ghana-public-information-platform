import type { AdministrationSummary } from '@gpip/db';
import Link from 'next/link';
import { formatRange, yearRange } from '../lib/format';
import { KIND_LABEL } from '../lib/timeline';

/** Leaders shown on the directory: who led the government, not deputies. */
function principals(a: AdministrationSummary): string {
  const names = a.leaders.filter((l) => l.role !== 'vice_president').map((l) => l.fullName);
  return [...new Set(names)].join(', ');
}

export function AdministrationTimeline({ items }: { items: AdministrationSummary[] }) {
  return (
    <ol className="spine">
      {items.map((a) => (
        <li key={a.slug} className="spine-item" data-kind={a.kind}>
          <Link href={`/history/administrations/${a.slug}`} className="spine-link">
            <span className="spine-years">{yearRange(a.startDate, a.endDate)}</span>{' '}
            <span className="spine-name">{a.name}</span>
          </Link>
          <p className="spine-leaders">{principals(a)}</p>
          <p className="spine-meta">
            <span>{formatRange(a.startDate, a.endDate)}</span>
            <span className="kind-tag" data-kind={a.kind}>
              {KIND_LABEL[a.kind]}
            </span>
            {a.party && <span>{a.party.name}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}
