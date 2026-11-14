import { reviewCounts } from '@gpip/db';
import Link from 'next/link';
import { getDb } from '../../lib/db';

export default async function AdminHome() {
  const counts = await reviewCounts(await getDb());
  return (
    <>
      <h1 className="page-title">Editor</h1>
      <p className="page-lede">
        Nothing extracted by AI reaches the public site until you approve it here.
      </p>
      <ul className="admin-cards">
        <li>
          <Link href="/admin/review">
            <strong>{counts.commitments}</strong> commitments waiting for review
          </Link>
        </li>
        <li>
          <Link href="/admin/corrections">
            <strong>{counts.corrections}</strong> new error reports
          </Link>
        </li>
        <li>
          <Link href="/admin/documents">Archive a document or run an extraction</Link>
        </li>
      </ul>
    </>
  );
}
