import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { type Flash, FlashMessage } from '@/components/ui/FlashMessage';

interface Props {
  /** The same-site page the report is about (already checked). */
  page: string;
  flash: Flash | null;
  action: (form: FormData) => Promise<void>;
}

/** The public "Report an error" form. Contact details are never published. */
export function ReportForm({ page, flash, action }: Props) {
  return (
    <PageContainer prose>
      <PageHeader
        title="Report an error"
        lede="Tell us what looks wrong and, if you can, link to the source that shows the correct information. An editor checks every report. Accepted corrections appear in the public change log."
      />
      <FlashMessage flash={flash} />
      <form action={action} className="stack card-form">
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
