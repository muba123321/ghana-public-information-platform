import { administrations, asc, getReviewItem, sectors } from '@gpip/db';
import { notFound } from 'next/navigation';
import { KIND_LABELS } from '../../../../components/KindBadge';
import { getDb } from '../../../../lib/db';
import { approveAction, rejectAction } from '../actions';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

const STATUSES = [
  'not_started',
  'in_progress',
  'completed',
  'partially_completed',
  'stalled',
  'discontinued',
  'superseded',
  'insufficient_evidence',
] as const;

export default async function ReviewItemPage({ params, searchParams }: Props) {
  const db = await getDb();
  const item = await getReviewItem(db, (await params).slug);
  if (!item) notFound();
  const { error } = await searchParams;
  const [admins, sectorRows] = await Promise.all([
    db
      .select({ slug: administrations.slug, name: administrations.name })
      .from(administrations)
      .orderBy(asc(administrations.startDate)),
    db.select().from(sectors).orderBy(asc(sectors.name)),
  ]);

  return (
    <div className="review">
      <section className="review-source" aria-label="Source document">
        <p className="muted">
          {item.documentTitle}, page {item.page} of {item.documentPages ?? '?'} —{' '}
          {item.provenance === 'ai_extracted' ? 'extracted by AI' : 'entered by hand'}
        </p>
        <iframe
          title={`${item.documentTitle}, page ${item.page}`}
          src={`/admin/documents/${item.documentId}/file#page=${item.page}`}
        />
      </section>

      <section className="review-form" aria-label="Check and correct">
        <h1 className="section-title">Check against the page, then approve</h1>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <form action={approveAction} className="stack">
          <input type="hidden" name="slug" value={item.slug} />
          <label>
            Wording (exactly as printed)
            <textarea name="wording" defaultValue={item.wording} rows={5} required />
          </label>
          <div className="row">
            <label>
              Page
              <input
                name="page"
                type="number"
                min={1}
                max={item.documentPages ?? undefined}
                defaultValue={item.page}
                required
              />
            </label>
            <label>
              Kind
              <select name="kind" defaultValue={item.kind}>
                {Object.entries(KIND_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Made by
              <select
                name="originatingAdministrationSlug"
                defaultValue={item.originatingAdministrationSlug}
              >
                {admins.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sector
              <select name="sectorSlug" defaultValue={item.sectorSlug ?? ''}>
                <option value="">None</option>
                {sectorRows.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Target (only if the document states one)
            <input name="target" defaultValue={item.target ?? ''} />
          </label>
          <div className="row">
            <label>
              Target date
              <input name="targetDeadline" type="date" defaultValue={item.targetDeadline ?? ''} />
            </label>
            <label>
              Status today
              <select name="finalStatus" defaultValue={item.finalStatus}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="button">
            Approve and publish
          </button>
        </form>

        <form action={rejectAction} className="stack reject">
          <input type="hidden" name="slug" value={item.slug} />
          <label>
            Or reject — reason (kept in the audit log)
            <input name="reason" required placeholder="e.g. not a checkable commitment" />
          </label>
          <button type="submit" className="button button--quiet">
            Reject
          </button>
        </form>
      </section>
    </div>
  );
}
