import { COMMITMENT_STATUSES, CURRENCIES } from '@gpip/core';
import type { ReviewItem } from '@gpip/db';
import { Button } from '@/components/ui/Button';
import { type Flash, FlashMessage } from '@/components/ui/FlashMessage';
import { KIND_LABELS } from '@/features/commitments';
import styles from './ReviewForm.module.css';

type Action = (form: FormData) => Promise<void>;
type Option = { slug: string; name: string };

interface Props {
  item: ReviewItem;
  flash: Flash | null;
  administrations: Option[];
  sectors: Option[];
  regions: (Option & { former: boolean })[];
  approve: Action;
  reject: Action;
}

/** The source page beside an editable copy of one draft: approve with corrections, or reject. */
export function ReviewForm({
  item,
  flash,
  administrations,
  sectors,
  regions,
  approve,
  reject,
}: Props) {
  return (
    <div className={styles.review}>
      <section className={styles.reviewSource} aria-label="Source document">
        <p className="muted">
          {item.documentTitle}, page {item.page} of {item.documentPages ?? '?'} —{' '}
          {item.provenance === 'ai_extracted' ? 'extracted by AI' : 'entered by hand'}
        </p>
        <iframe
          title={`${item.documentTitle}, page ${item.page}`}
          src={`/admin/documents/${item.documentId}/file#page=${item.page}`}
        />
      </section>

      <section className={styles.reviewForm} aria-label="Check and correct">
        <h1 className="section-title">Check against the page, then approve</h1>
        <FlashMessage flash={flash} />
        <form action={approve} className="stack">
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
                {administrations.map((a) => (
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
                {sectors.map((s) => (
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
                {COMMITMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {item.budgets.length > 0 && (
            <fieldset className="stack">
              <legend>Money figures found on the page — check each one</legend>
              {item.budgets.map((b) => (
                <div key={b.id} className="row" data-budget={b.id}>
                  <input type="hidden" name="budgetId" value={b.id} />
                  <label>
                    {b.kind} amount
                    <input
                      name={`budget-${b.id}-amount`}
                      type="number"
                      step="any"
                      min={0}
                      defaultValue={b.amount}
                    />
                  </label>
                  <label>
                    Currency
                    <select name={`budget-${b.id}-currency`} defaultValue={b.currency}>
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fiscal year
                    <input
                      name={`budget-${b.id}-fiscalYear`}
                      type="number"
                      min={1957}
                      defaultValue={b.fiscalYear ?? ''}
                    />
                  </label>
                  <label>
                    <input type="checkbox" name={`budget-${b.id}-publish`} /> Publish this figure
                  </label>
                </div>
              ))}
              <p className="muted">Unticked figures are dropped (kept only in the audit log).</p>
            </fieldset>
          )}
          <fieldset className={styles.regions}>
            <legend>Regions this commitment names</legend>
            <label>
              <input type="checkbox" name="nationwide" defaultChecked={item.nationwide} />{' '}
              Nationwide (listed under no region)
            </label>
            <div className={styles.regionGrid}>
              {regions.map((r) => (
                <label key={r.slug}>
                  <input
                    type="checkbox"
                    name="region"
                    value={r.slug}
                    defaultChecked={item.regions.includes(r.slug)}
                  />{' '}
                  {r.name}
                  {r.former ? ' (former)' : ''}
                </label>
              ))}
            </div>
            <p className="muted">
              Pre-ticked from the places the document names. Check against the page.
            </p>
          </fieldset>
          <Button>Approve and publish</Button>
        </form>

        <form action={reject} className={`stack ${styles.reject}`}>
          <input type="hidden" name="slug" value={item.slug} />
          <label>
            Or reject — reason (kept in the audit log)
            <input name="reason" required placeholder="e.g. not a checkable commitment" />
          </label>
          <Button variant="quiet">Reject</Button>
        </form>
      </section>
    </div>
  );
}
