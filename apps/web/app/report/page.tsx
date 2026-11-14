import type { Metadata } from 'next';
import { submitReportAction } from './actions';

export const metadata: Metadata = { title: 'Report an error', robots: { index: false } };

type Props = { searchParams: Promise<{ from?: string; error?: string }> };

export default async function ReportPage({ searchParams }: Props) {
  const { from, error } = await searchParams;
  const page = from?.startsWith('/') && !from.startsWith('//') ? from : '/';
  return (
    <div className="container page prose">
      <h1 className="page-title">Report an error</h1>
      <p className="page-lede">
        Tell us what looks wrong and, if you can, link to the source that shows the correct
        information. An editor checks every report. Accepted corrections appear in the public change
        log.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <form action={submitReportAction} className="stack card-form">
        <input type="hidden" name="pageUrl" value={page} />
        <p className="muted">
          About the page: <a href={page}>{page}</a>
        </p>
        <label>
          What looks wrong?
          <textarea name="message" rows={6} maxLength={4000} required />
        </label>
        <label>
          Link to evidence (optional)
          <input name="evidenceUrl" type="url" placeholder="https://…" />
        </label>
        <label>
          How can we reach you? (optional, never published)
          <input name="contact" maxLength={200} />
        </label>
        <div className="hp" aria-hidden="true">
          <label>
            Leave this empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button type="submit" className="button">
          Send report
        </button>
      </form>
    </div>
  );
}
