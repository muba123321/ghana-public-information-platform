import Link from 'next/link';
import { cssVars } from '@/lib/css-vars';
import { ADMINISTRATION_KIND_WORDS } from '../labels';
import type { RibbonSegment } from '../timeline';
import styles from './TimelineRibbon.module.css';

interface Props {
  segments: RibbonSegment[];
  ticks: { year: number; pct: number }[];
  currentSlug?: string;
  size?: 'large' | 'compact';
}

/**
 * Every administration as one band, sized by time in office. Bands alternate between two neutral
 * tones by position (never by party); military rule is hatched. Each band links to its profile.
 */
export function TimelineRibbon({ segments, ticks, currentSlug, size = 'large' }: Props) {
  return (
    <div
      className={size === 'compact' ? `${styles.ribbon} ${styles.ribbonCompact}` : styles.ribbon}
    >
      <ol className={styles.ribbonTrack} aria-label="Governments of Ghana from 1957 to today">
        {segments.map((s, i) => {
          const current = s.slug === currentSlug;
          const mid = s.startPct + s.widthPct / 2;
          const align = mid < 22 ? 'start' : mid > 78 ? 'end' : 'center';
          return (
            <li
              key={s.slug}
              className={styles.ribbonBand}
              data-kind={s.kind}
              data-tone={i % 2 === 0 ? 'a' : 'b'}
              data-current={current || undefined}
              data-align={align}
              style={cssVars({ '--width': `${s.widthPct}%`, '--delay': `${i * 35}ms` })}
            >
              <Link
                href={`/history/administrations/${s.slug}`}
                aria-label={`${s.name}, ${s.years}, ${ADMINISTRATION_KIND_WORDS[s.kind]}`}
                aria-current={current ? 'page' : undefined}
              >
                <span className={styles.ribbonTip} aria-hidden="true">
                  <strong>{s.name}</strong>
                  <span>{s.years}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {ticks.length > 0 && (
        <div className="ribbon-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t.year} style={cssVars({ '--left': `${t.pct}%` })}>
              {t.year}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
