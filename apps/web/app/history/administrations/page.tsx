import type { Metadata } from 'next';
import Link from 'next/link';
import { AdministrationTimeline } from '../../../components/AdministrationTimeline';
import { RibbonLegend, TimelineRibbon } from '../../../components/TimelineRibbon';
import { loadRibbon } from '../../../lib/data';
import { filterByKind, parseKind } from '../../../lib/timeline';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Administration directory' };

type Props = { searchParams: Promise<{ kind?: string }> };

const FILTERS = [
  { label: 'All', kind: undefined },
  { label: 'Civilian', kind: 'civilian' },
  { label: 'Military', kind: 'military' },
] as const;

export default async function AdministrationsPage({ searchParams }: Props) {
  const { items, segments, ticks } = await loadRibbon();
  const kind = parseKind((await searchParams).kind);
  const shown = filterByKind(items, kind);
  const military = items.filter((a) => a.kind === 'military').length;

  return (
    <>
      <div className="container page page--flush">
        <h1 className="page-title">Every government since independence</h1>
        <p className="page-lede">
          {items.length} governments from 1957 to today: {items.length - military} civilian and{' '}
          {military} military, in date order.
        </p>
      </div>
      <div className="container container--wide ribbon-wrap">
        <TimelineRibbon segments={segments} ticks={ticks} size="compact" />
        <RibbonLegend />
      </div>
      <div className="container page">
        <nav aria-label="Filter governments" className="filters">
          {FILTERS.map((f) => (
            <Link
              key={f.label}
              href={f.kind ? `?kind=${f.kind}` : '?'}
              className="filter"
              aria-current={kind === f.kind ? 'page' : undefined}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <AdministrationTimeline items={shown} />
      </div>
    </>
  );
}
