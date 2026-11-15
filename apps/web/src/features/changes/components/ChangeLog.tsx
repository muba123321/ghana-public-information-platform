import type { ChangeLogEntry } from '@gpip/db';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/format';
import { CHANGE_ACTION_LABELS, publicPageFor, RECORD_TYPE_LABELS } from '../labels';

/** One page of published changes, newest first. */
export function ChangeLog({
  items,
  page,
  pages,
}: {
  items: ChangeLogEntry[];
  page: number;
  pages: number;
}) {
  return (
    <PageContainer>
      <PageHeader
        title="Change log"
        lede="Every change to published information, newest first — additions, corrections and records retired. Nothing is edited silently."
      />
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
            const href = publicPageFor(i.entityTable, i.entityKey);
            return (
              <tr key={i.id}>
                <td>{formatDate(i.changedAt.toISOString().slice(0, 10))}</td>
                <td>
                  {CHANGE_ACTION_LABELS[i.action]}{' '}
                  {(RECORD_TYPE_LABELS[i.entityTable] ?? 'Record').toLowerCase()}
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
    </PageContainer>
  );
}
