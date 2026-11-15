import { safeLocalPath } from '@gpip/core';
import { listCorrectionReports } from '@gpip/db';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { getDb } from '@/server/db';
import { requireEditor } from '@/server/editor-access';
import { setCorrectionStatusAction } from './admin-actions';

export default async function CorrectionsPage() {
  await requireEditor(); // pages render without the layout on client navigations
  const reports = await listCorrectionReports(await getDb());
  return (
    <>
      <PageHeader
        title="Error reports"
        lede="Sent through “Report an error”. Nothing here is public."
      />
      <ul className="queue">
        {reports.map((r) => (
          <li key={r.id} className="report" data-status={r.status}>
            <p>
              {safeLocalPath(r.pageUrl) ? (
                <a href={safeLocalPath(r.pageUrl) ?? '/'}>{r.pageUrl}</a>
              ) : (
                <span>{r.pageUrl}</span>
              )}{' '}
              · {formatDate(r.createdAt.toISOString().slice(0, 10))} · <strong>{r.status}</strong>
            </p>
            <p className="report-message">{r.message}</p>
            {r.evidenceUrl && (
              <p>
                Evidence:{' '}
                <a href={r.evidenceUrl} rel="noopener noreferrer nofollow">
                  {r.evidenceUrl}
                </a>
              </p>
            )}
            {r.contact && <p className="muted">Contact: {r.contact}</p>}
            <form action={setCorrectionStatusAction} className="row">
              <input type="hidden" name="id" value={r.id} />
              {(['reviewed', 'actioned', 'dismissed'] as const).map((s) => (
                <Button variant="link" key={s} name="status" value={s}>
                  Mark {s}
                </Button>
              ))}
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
