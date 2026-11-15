import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';

/** The editor's start page: what is waiting, and where to go next. */
export function EditorOverview({
  counts,
}: {
  counts: { commitments: number; corrections: number };
}) {
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
