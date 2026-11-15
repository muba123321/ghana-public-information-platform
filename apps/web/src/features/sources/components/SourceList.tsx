import type { DocumentSummary } from '@gpip/db';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Callout } from '@/components/ui/Callout';
import { DOCUMENT_TYPE_LABELS } from '../labels';

/** The original documents behind published commitments, each linked to its publisher. */
export function SourceList({ docs }: { docs: DocumentSummary[] }) {
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
                  {DOCUMENT_TYPE_LABELS[d.docType] ?? d.docType}, {d.publisher}
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
