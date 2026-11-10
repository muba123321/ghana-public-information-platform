import { API_LICENCE, CACHE_HEADERS } from '../../../../lib/api';
import { loadIndicators } from '../../../../lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await loadIndicators();
  return Response.json(
    { data, meta: { licence: API_LICENCE, generatedAt: new Date().toISOString() } },
    { headers: CACHE_HEADERS },
  );
}
