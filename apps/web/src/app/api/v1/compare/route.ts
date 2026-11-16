import type { NextRequest } from 'next/server';
import { parseCompareParams, toCsvRows } from '@/features/compare';
import { loadCompareOptions, loadComparison } from '@/features/compare/server/queries';
import { toCsv } from '@/features/indicators';
import { API_LICENCE, CACHE_HEADERS } from '@/server/api';

export const dynamic = 'force-dynamic';

/** The same comparison as /history/compare, as JSON or (format=csv) CSV. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const options = await loadCompareOptions();
  const selection = parseCompareParams(Object.fromEntries(q), {
    terms: options.terms.map((t) => t.slug),
    persons: options.persons.map((p) => p.slug),
    topics: options.topics.map((t) => t.slug),
  });
  if (!selection.ready) {
    return Response.json(
      { error: 'Give at least two known governments (a, b) — or people with by=person.' },
      { status: 400 },
    );
  }
  const comparison = await loadComparison(selection);
  if (q.get('format') === 'csv') {
    return new Response(toCsv(...toCsvRows(comparison)), {
      headers: {
        ...CACHE_HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gpip-compare-${selection.topic}.csv"`,
      },
    });
  }
  return Response.json({ ...comparison, licence: API_LICENCE }, { headers: CACHE_HEADERS });
}
