import { safeLocalPath } from '@gpip/core';
import type { Metadata } from 'next';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { FlashMessage } from '@/components/ui/FlashMessage';
import { readFlash } from '@/server/flash';
import { submitReportAction } from './actions';

export const metadata: Metadata = { title: 'Report an error', robots: { index: false } };

type Props = { searchParams: Promise<{ from?: string }> };

export default async function ReportPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const page = safeLocalPath(from ?? '/') ?? '/';
  const flash = await readFlash();
  return (
    <PageContainer prose>
      <PageHeader
        title="Report an error"
        lede="Tell us what looks wrong and, if you can, link to the source that shows the correct information. An editor checks every report. Accepted corrections appear in the public change log."
      />
      <FlashMessage flash={flash} />
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
        <Button>Send report</Button>
      </form>
    </PageContainer>
  );
}
