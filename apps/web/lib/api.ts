import 'server-only';

export const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export const API_LICENCE =
  "Each indicator keeps its source publisher's licence (see meta.source and https://github.com/muba123321/ghana-public-information-platform). GPIP adds no restrictions.";

export const notFound = () => Response.json({ error: 'Unknown indicator' }, { status: 404 });
