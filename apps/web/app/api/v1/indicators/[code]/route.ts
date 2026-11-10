import type { NextRequest } from 'next/server';
import { API_LICENCE, CACHE_HEADERS, notFound } from '../../../../../lib/api';
import { loadIndicatorSeries } from '../../../../../lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const s = await loadIndicatorSeries(
    (await params).code,
    req.nextUrl.searchParams.get('vintage') ?? undefined,
  );
  if (!s) return notFound();
  return Response.json(
    {
      data: {
        indicator: s.indicator,
        observations: s.points.map((p) => ({
          year: p.period.start.slice(0, 4),
          periodStart: p.period.start,
          periodEnd: p.period.end,
          value: p.value,
          estimateType: p.estimateType,
        })),
      },
      meta: {
        source: s.source,
        vintage: s.vintage,
        vintages: s.vintages,
        licence: API_LICENCE,
        generatedAt: new Date().toISOString(),
      },
    },
    { headers: CACHE_HEADERS },
  );
}
