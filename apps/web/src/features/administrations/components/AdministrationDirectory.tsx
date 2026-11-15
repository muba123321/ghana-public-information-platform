import type { AdministrationKind } from '@gpip/core';
import type { AdministrationSummary } from '@gpip/db';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ADMINISTRATION_FILTERS } from '../labels';
import type { RibbonSegment, ribbonTicks } from '../timeline';
import { filterByKind } from '../timeline';
import styles from './AdministrationDirectory.module.css';
import { AdministrationTimeline } from './AdministrationTimeline';
import { RibbonLegend } from './RibbonLegend';
import { TimelineRibbon } from './TimelineRibbon';

interface Props {
  items: AdministrationSummary[];
  segments: RibbonSegment[];
  ticks: ReturnType<typeof ribbonTicks>;
  kind: AdministrationKind | undefined;
}

/** Every government since independence: the ribbon, a civilian/military filter and the list. */
export function AdministrationDirectory({ items, segments, ticks, kind }: Props) {
  const shown = filterByKind(items, kind);
  const military = items.filter((a) => a.kind === 'military').length;

  return (
    <>
      <div className={`container page ${styles.pageFlush}`}>
        <PageHeader
          title="Every government since independence"
          lede={
            <>
              {items.length} governments from 1957 to today: {items.length - military} civilian and{' '}
              {military} military, in date order.
            </>
          }
        />
      </div>
      <div className="container container--wide ribbon-wrap">
        <TimelineRibbon segments={segments} ticks={ticks} size="compact" />
        <RibbonLegend />
      </div>
      <PageContainer>
        <nav aria-label="Filter governments" className={styles.filters}>
          {ADMINISTRATION_FILTERS.map((f) => (
            <Link
              key={f.label}
              href={f.kind ? `?kind=${f.kind}` : '?'}
              className={styles.filter}
              aria-current={kind === f.kind ? 'page' : undefined}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <AdministrationTimeline items={shown} />
      </PageContainer>
    </>
  );
}
