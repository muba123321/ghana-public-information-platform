import type { Metadata } from 'next';
import Link from 'next/link';
import { loadInstitutions } from '../../../lib/data';
import { formatDate } from '../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ministry history' };

export default async function MinistriesPage() {
  const list = await loadInstitutions();
  return (
    <div className="container page">
      <h1 className="page-title">Ministries and institutions</h1>
      <p className="page-lede">
        Ministries are created, renamed and merged. Each one keeps a single history here, so its
        commitments can be followed whatever it was called at the time.
      </p>
      {list.length === 0 ? (
        <p className="callout">Ministry histories appear here as they are verified.</p>
      ) : (
        <ul className="indicator-list">
          {list.map((i) => (
            <li key={i.slug}>
              <Link href={`/history/ministries/${i.slug}`} className="indicator-link">
                <span className="indicator-name">{i.name}</span>
                <span className="indicator-meta">
                  {i.until ? `until ${formatDate(i.until)}` : `since ${formatDate(i.since)}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
