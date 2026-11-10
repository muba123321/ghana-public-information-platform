import type { AdministrationSummary } from '@gpip/db';
import Link from 'next/link';
import { formatRange, yearRange } from '../lib/format';

/** Leaders shown on the directory: who led the government, not deputies. */
function principals(a: AdministrationSummary): string {
  const names = a.leaders.filter((l) => l.role !== 'vice_president').map((l) => l.fullName);
  return [...new Set(names)].join(', ');
}

export function AdministrationTimeline({ items }: { items: AdministrationSummary[] }) {
  return (
    <ol className="timeline">
      {items.map((a) => (
        <li key={a.slug} className="timeline-item">
          <Link href={`/history/administrations/${a.slug}`} className="timeline-link">
            <span className="timeline-years">{yearRange(a.startDate, a.endDate)}</span>{' '}
            <span className="timeline-name">{a.name}</span>
          </Link>
          <p className="timeline-meta">
            <span>{formatRange(a.startDate, a.endDate)}</span>
            <span>{a.party ? a.party.name : 'Military government'}</span>
          </p>
          <p className="timeline-leaders">{principals(a)}</p>
        </li>
      ))}
    </ol>
  );
}
