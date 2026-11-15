import { loadIndicators } from '@/features/indicators/server/queries';
import { API_LICENCE, CACHE_HEADERS } from '@/server/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await loadIndicators();
  return Response.json(
    { data, meta: { licence: API_LICENCE, generatedAt: new Date().toISOString() } },
    { headers: CACHE_HEADERS },
  );
}
