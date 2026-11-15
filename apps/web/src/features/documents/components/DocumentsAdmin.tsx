import type { AdminDocument } from '@gpip/db';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { type Flash, FlashMessage } from '@/components/ui/FlashMessage';
import styles from './DocumentsAdmin.module.css';

type Action = (form: FormData) => Promise<void>;

interface Props {
  docs: AdminDocument[];
  flash: Flash | null;
  archive: Action;
  extract: Action;
}

/** Archive a publisher's document and run extraction; every archived original is listed. */
export function DocumentsAdmin({ docs, flash, archive, extract }: Props) {
  return (
    <>
      <PageHeader title="Documents" />
      <FlashMessage flash={flash} />

      <form action={archive} className="stack card-form">
        <h2 className="section-title">Archive a document</h2>
        <div className="row">
          <label>
            Publisher URL (cited as the source)
            <input type="url" name="url" required placeholder="https://…" />
          </label>
          <label>
            PDF file (only if the URL can&apos;t be downloaded)
            <input type="file" name="file" accept="application/pdf" />
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
        <label className={styles.check}>
          <input type="checkbox" name="publicRedistribution" /> The publisher&apos;s licence allows
          sharing copies
        </label>
        <Button>Archive</Button>
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
                <form action={extract}>
                  <input type="hidden" name="documentId" value={d.id} />
                  <Button variant="link">Extract with Claude API</Button>
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
