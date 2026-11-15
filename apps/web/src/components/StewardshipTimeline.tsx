import type { StewardshipView } from '@gpip/db';
import { NotAvailable } from './NotAvailable';
import { STATUS_LABELS } from './StatusLabel';

interface Props {
  stewardships: StewardshipView[];
  /** Every administration slug in date order — tones alternate by position, like the ribbon. */
  timeline: string[];
}

/**
 * The heart of cross-government tracking: one row per government that held the commitment, with
 * the progress made while it was in office. The government that finished it is not credited with
 * the whole.
 */
export function StewardshipTimeline({ stewardships, timeline }: Props) {
  return (
    <ol className="stewardship">
      {stewardships.map((s) => {
        const i = timeline.indexOf(s.administrationSlug);
        const known = s.progressAtStart !== null && s.progressAtEnd !== null;
        const delta = known ? (s.progressAtEnd as number) - (s.progressAtStart as number) : null;
        return (
          <li key={s.administrationSlug} className="steward">
            <div className="steward-head">
              <strong>{s.administrationName}</strong>
              <span className="muted">{STATUS_LABELS[s.status]}</span>
            </div>
            <div className="steward-track" aria-hidden="true">
              {known && (
                <span
                  data-tone={i % 2 === 0 ? 'a' : 'b'}
                  style={{
                    left: `${s.progressAtStart}%`,
                    width: `${Math.max(delta as number, 1)}%`,
                  }}
                />
              )}
            </div>
            <p className="steward-progress">
              Progress while in office:{' '}
              {known ? (
                <>
                  <strong>{`${(delta as number) >= 0 ? '+' : ''}${delta} points`}</strong>{' '}
                  <span className="muted">{`${s.progressAtStart}% → ${s.progressAtEnd}%`}</span>
                </>
              ) : (
                <NotAvailable what="Progress" />
              )}
            </p>
            {s.notes && <p className="muted">{s.notes}</p>}
          </li>
        );
      })}
    </ol>
  );
}
