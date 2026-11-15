import type { Metadata } from 'next';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Callout } from '@/components/ui/Callout';
import { loadSources } from '@/lib/data';

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
    <PageContainer>
      <PageHeader
        title="Sources and documents"
        lede="The original documents published commitments are taken from. Links go to the publisher; we keep an archived copy so each quotation can be checked against the page it came from."
      />
      {docs.length === 0 ? (
        <Callout>Documents appear here once they are archived.</Callout>
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
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
