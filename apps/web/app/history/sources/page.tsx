import type { Metadata } from 'next';
import { loadSources } from '../../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sources and documents' };

const TYPES: Record<string, string> = {
  manifesto: 'Manifesto',
  budget_statement: 'Budget statement',
  development_plan: 'Development plan',
  policy_statement: 'Policy statement',
};

export default async function SourcesPage() {
  const docs = await loadSources();
  return (
    <div className="container page">
      <h1 className="page-title">Sources and documents</h1>
      <p className="page-lede">
        The original documents commitments are taken from. Links go to the publisher. A copy is
        offered here only when the publisher&apos;s licence allows it.
      </p>
      {docs.length === 0 ? (
        <p className="callout">Documents appear here once they are archived.</p>
      ) : (
        <ul className="indicator-list">
          {docs.map((d) => (
            <li key={d.id}>
              <div className="indicator-link">
                <a href={d.url} rel="noopener" className="indicator-name">
                  {d.title}
                </a>
                <span className="indicator-meta">
                  {TYPES[d.docType] ?? d.docType}, {d.publisher}
                  {d.pages ? `, ${d.pages} pages` : ''}
                  {d.administration ? ` — ${d.administration.name}` : ''}
                </span>
              </div>
              {d.downloadable ? <span className="pill">Copy available</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
