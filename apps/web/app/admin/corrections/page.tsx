import { listCorrectionReports } from '@gpip/db';
import { getDb } from '../../../lib/db';
import { formatDate } from '../../../lib/format';
import { setCorrectionStatusAction } from './actions';

export default async function CorrectionsPage() {
  const reports = await listCorrectionReports(await getDb());
  return (
    <>
      <h1 className="page-title">Error reports</h1>
      <p className="page-lede">Sent through “Report an error”. Nothing here is public.</p>
      <ul className="queue">
        {reports.map((r) => (
          <li key={r.id} className="report" data-status={r.status}>
            <p>
              <a href={r.pageUrl}>{r.pageUrl}</a> ·{' '}
              {formatDate(r.createdAt.toISOString().slice(0, 10))} · <strong>{r.status}</strong>
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
                <button key={s} type="submit" name="status" value={s} className="link-button">
                  Mark {s}
                </button>
              ))}
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
