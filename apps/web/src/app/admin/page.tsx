import { reviewCounts } from '@gpip/db';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';

export default async function AdminHome() {
  await requireEditor(); // pages render without the layout on client navigations
  const counts = await reviewCounts(await getDb());
  return (
    <>
      <PageHeader
        title="Editor"
        lede="Nothing extracted by AI reaches the public site until you approve it here."
      />
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
