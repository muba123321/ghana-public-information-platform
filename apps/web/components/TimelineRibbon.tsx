import Link from 'next/link';
import type { RibbonSegment } from '../lib/timeline';

interface Props {
  segments: RibbonSegment[];
  ticks: { year: number; pct: number }[];
  currentSlug?: string;
  size?: 'large' | 'compact';
}

const KIND_WORDS = {
  civilian: 'civilian government',
  military: 'military government',
  transitional: 'transitional government',
};

/**
 * Every administration as one band, sized by time in office. Bands alternate between two neutral
 * tones by position (never by party); military rule is hatched. Each band links to its profile.
 */
export function TimelineRibbon({ segments, ticks, currentSlug, size = 'large' }: Props) {
  return (
    <div className={`ribbon ribbon--${size}`}>
      <ol className="ribbon-track" aria-label="Governments of Ghana from 1957 to today">
        {segments.map((s, i) => {
          const current = s.slug === currentSlug;
          const mid = s.startPct + s.widthPct / 2;
          const align = mid < 22 ? 'start' : mid > 78 ? 'end' : 'center';
          return (
            <li
              key={s.slug}
              className="ribbon-band"
              data-kind={s.kind}
              data-tone={i % 2 === 0 ? 'a' : 'b'}
              data-current={current || undefined}
              data-align={align}
              style={{ width: `${s.widthPct}%`, animationDelay: `${i * 35}ms` }}
            >
              <Link
                href={`/history/administrations/${s.slug}`}
                aria-label={`${s.name}, ${s.years}, ${KIND_WORDS[s.kind]}`}
                aria-current={current ? 'page' : undefined}
              >
                <span className="ribbon-tip" aria-hidden="true">
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
            <span key={t.year} style={{ left: `${t.pct}%` }}>
              {t.year}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RibbonLegend() {
  return (
    <p className="ribbon-legend">
      <span className="swatch swatch--civilian" aria-hidden="true" /> Civilian government
      <span className="swatch swatch--military" aria-hidden="true" /> Military government
    </p>
  );
}
