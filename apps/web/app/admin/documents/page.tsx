import { listDocumentsForAdmin } from '@gpip/db';
import Link from 'next/link';
import { getDb } from '../../../lib/db';
import { readFlash } from '../../../lib/flash';
import { archiveAction, extractAction } from './actions';

export default async function DocumentsPage() {
  const docs = await listDocumentsForAdmin(await getDb());
  const flash = await readFlash();
  return (
    <>
      <h1 className="page-title">Documents</h1>
      {flash?.kind === 'note' && <p className="form-note">{flash.text}</p>}
      {flash?.kind === 'error' && (
        <p className="form-error" role="alert">
          {flash.text}
        </p>
      )}

      <form action={archiveAction} className="stack card-form">
        <h2 className="section-title">Archive a document</h2>
        <div className="row">
          <label>
            PDF file
            <input type="file" name="file" accept="application/pdf" />
          </label>
          <label>
            or publisher URL
            <input type="url" name="url" placeholder="https://…" />
          </label>
        </div>
        <div className="row">
          <label>
            Title
            <input name="title" required placeholder="NPP 2016 Manifesto" />
          </label>
          <label>
            Publisher
            <input name="publisher" required placeholder="New Patriotic Party" />
          </label>
        </div>
        <div className="row">
          <label>
            Type
            <select name="docType" defaultValue="manifesto">
              <option value="manifesto">Manifesto</option>
              <option value="budget_statement">Budget statement</option>
              <option value="development_plan">Development plan</option>
              <option value="policy_statement">Policy statement</option>
            </select>
          </label>
          <label>
            Government it applies to (slug)
            <input name="administrationSlug" placeholder="2017-akufo-addo-i" />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" name="publicRedistribution" /> The publisher&apos;s licence allows
          sharing copies
        </label>
        <button type="submit" className="button">
          Archive
        </button>
      </form>

      <table className="series-table admin-table">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Pages</th>
            <th scope="col">Waiting</th>
            <th scope="col">Last extraction</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>
                <Link href={`/admin/documents/${d.id}/file`}>{d.title}</Link>
                <br />
                <span className="muted">{d.administrationSlug ?? 'no government set'}</span>
              </td>
              <td>{d.pages ?? '?'}</td>
              <td>{d.waiting > 0 ? <Link href="/admin/review">{d.waiting}</Link> : 0}</td>
              <td>
                {d.latestRun
                  ? `${d.latestRun.status}: ${d.latestRun.itemsQueued}/${d.latestRun.itemsFound} queued (${d.latestRun.model}${d.latestRun.costUsd ? `, $${d.latestRun.costUsd.toFixed(2)}` : ''})`
                  : 'never'}
                {d.latestRun?.error && <span className="form-error"> {d.latestRun.error}</span>}
              </td>
              <td>
                <form action={extractAction}>
                  <input type="hidden" name="documentId" value={d.id} />
                  <button type="submit" className="link-button">
                    Extract with Claude API
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        No API key? Ask Claude Code to read the PDF in a session and run{' '}
        <code>pnpm extract --document &lt;id&gt; --from-json &lt;file&gt;</code>.
      </p>
    </>
  );
}
