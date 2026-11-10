import type { NextRequest } from 'next/server';
import { CACHE_HEADERS, notFound } from '../../../../../../lib/api';
import { toCsv } from '../../../../../../lib/csv';
import { loadIndicatorSeries } from '../../../../../../lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = await loadIndicatorSeries(code, req.nextUrl.searchParams.get('vintage') ?? undefined);
  if (!s) return notFound();
  const source = `${s.source.publisher}: ${s.source.title}`;
  const csv = toCsv(
    ['indicator', 'year', 'value', 'estimate_type', 'source', 'vintage'],
    s.points.map((p) => [
      code,
      p.period.start.slice(0, 4),
      p.value,
      p.estimateType,
      source,
      p.vintage,
    ]),
  );
  return new Response(csv, {
    headers: {
      ...CACHE_HEADERS,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gpip-${code}${s.vintage ? `-${s.vintage}` : ''}.csv"`,
    },
  });
}
