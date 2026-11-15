import { safeLocalPath } from '@gpip/core';
import type { listCorrectionReports } from '@gpip/db';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { CORRECTION_OUTCOMES } from '../outcomes';

type Report = Awaited<ReturnType<typeof listCorrectionReports>>[number];

/** Editor view of every error report, newest first, with the three outcomes as buttons. */
export function ReportQueue({
  reports,
  action,
}: {
  reports: Report[];
  action: (form: FormData) => Promise<void>;
}) {
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
            <form action={action} className="row">
              <input type="hidden" name="id" value={r.id} />
              {CORRECTION_OUTCOMES.map((s) => (
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
