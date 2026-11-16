import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

/**
 * The rules behind every comparison, in plain English. Each section states exactly what
 * packages/core implements (tenureSummary, associate, inheritedBaseline, leaderStretches).
 */
export function Methodology() {
  return (
    <PageContainer prose>
      <PageHeader
        title="How we compare"
        lede="The rules we use to put governments side by side. They are the same for every government, and they never produce a score."
      />

      <h2>Which government a year belongs to</h2>
      <p>
        Most figures are published once a year. A year belongs to the government that was in office
        for the longest part of it. When power changed hands during a year, the tables say the
        government&apos;s years include a shared year. A year is only counted once it has ended.
      </p>

      <h2>The inherited starting point</h2>
      <p>
        Every government starts from what it inherited: the figure for the year just before its
        first year in office — the last year of the government before it. So one government&apos;s
        last year is the next one&apos;s starting point, and no year is skipped or counted twice. If
        that year&apos;s figure was never published, we show it as not available. We never quietly
        use an older year instead.
      </p>

      <h2>Last figure, average and change</h2>
      <p>
        The <strong>last figure</strong> is the most recent year in office that has a published
        figure, always shown with its year. A government still in office has no figure yet for the
        year in progress, so its last figure is the latest year that has one. The{' '}
        <strong>average</strong> is the mean of the published figures for its years. The{' '}
        <strong>change</strong> is the last figure minus the inherited one, in the indicator&apos;s
        own unit: for a percentage, that is percentage points (pp).
      </p>

      <h2>Years with figures</h2>
      <p>
        Next to every summary we show how many of the government&apos;s years have a published
        figure — for example, &ldquo;3 of 8&rdquo;. Missing years are never counted as zero. When
        fewer than half the years have figures, the tables say &ldquo;few figures&rdquo;: treat that
        summary with care.
      </p>

      <h2>Modelled figures and projections</h2>
      <p>
        Some figures are modelled estimates rather than direct measurements; we include them and say
        so. Forecasts and projections are never treated as results and are left out of every
        summary.
      </p>

      <h2>Comparing people, not just terms</h2>
      <p>
        When you compare leaders, each stretch is assigned to the person who led the government: the
        Prime Minister where there was one (for example 1957–60 and 1969–72), otherwise the
        President or the military head of state. A handover during a term splits it on the day of
        the handover. A leader&apos;s separate periods in office are shown separately, each from its
        own starting point; we never blend them into one figure.
      </p>

      <h2>Why there are no scores</h2>
      <p>
        We do not rate, rank or grade governments, and we do not combine indicators into a single
        number. We show the published figures, the starting point each government inherited, and the
        gaps, and leave the judgement to you.
      </p>

      <h2>Effects take time</h2>
      <p>
        Being in office is not the same as causing a change. Many results take years to appear, and
        events outside Ghana — world prices, pandemics, global recessions — matter too. That is why
        each comparison lists the events of those years. Read more in the{' '}
        <Link href="/data-notice">data notice</Link>.
      </p>
    </PageContainer>
  );
}
