import { listChangeLog } from '@gpip/db';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '../../lib/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Change log' };

type Props = { searchParams: Promise<{ page?: string }> };
const PER_PAGE = 50;

const WHAT: Record<string, string> = {
  administrations: 'Government',
  administration_leaders: 'Government leaders',
  parties: 'Party',
  persons: 'Person',
  sectors: 'Sector',
  sources: 'Source',
  indicators: 'Indicator',
  context_events: 'Chart event',
  institution_versions: 'Ministry',
  commitments: 'Commitment',
  commitment_stewardships: 'Commitment history',
};
const ACTION = { insert: 'Added', update: 'Updated', delete: 'Removed' } as const;

const linkFor = (table: string, key: string) =>
  table === 'administrations'
    ? `/history/administrations/${key}`
    : table === 'commitments' || table === 'commitment_stewardships'
      ? `/history/commitments/${key}`
      : table === 'indicators'
        ? `/history/indicators/${key}`
        : null;

const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export default async function ChangesPage({ searchParams }: Props) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await listChangeLog(await getDb(), { page, perPage: PER_PAGE });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  return (
    <div className="container page">
      <h1 className="page-title">Change log</h1>
      <p className="page-lede">
        Every change to published information, newest first — additions, corrections and records
        retired. Nothing is edited silently.
      </p>
      <table className="series-table admin-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Change</th>
            <th scope="col">Record</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const href = linkFor(i.entityTable, i.entityKey);
            return (
              <tr key={i.id}>
                <td>{when.format(i.changedAt)}</td>
                <td>
                  {ACTION[i.action]} {(WHAT[i.entityTable] ?? 'Record').toLowerCase()}
                </td>
                <td>{href ? <Link href={href}>{i.entityKey}</Link> : i.entityKey}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pages > 1 && (
        <nav className="pager" aria-label="Change log pages">
          {page > 1 ? <Link href={`?page=${page - 1}`}>Newer</Link> : <span />}
          {page < pages && <Link href={`?page=${page + 1}`}>Older</Link>}
        </nav>
      )}
    </div>
  );
}
