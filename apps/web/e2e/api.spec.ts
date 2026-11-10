import { expect, test } from '@playwright/test';

test('lists every published indicator', async ({ request }) => {
  const res = await request.get('/api/v1/indicators');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data).toHaveLength(17);
  expect(body.meta.licence).toMatch(/source/i);
});

test('returns one indicator with its observations and source', async ({ request }) => {
  const res = await request.get('/api/v1/indicators/inflation');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('s-maxage=3600');
  const body = await res.json();
  expect(body.data.indicator.code).toBe('inflation');
  expect(body.data.observations.length).toBeGreaterThan(50);
  expect(body.data.observations[0]).toEqual(
    expect.objectContaining({ year: expect.any(String), estimateType: 'reported' }),
  );
  expect(body.meta.source.url).toMatch(/^https:\/\//);
});

test('unknown indicator is a JSON 404', async ({ request }) => {
  const res = await request.get('/api/v1/indicators/not-real');
  expect(res.status()).toBe(404);
  expect(await res.json()).toEqual({ error: 'Unknown indicator' });
});

test('CSV download has the documented columns', async ({ request }) => {
  const res = await request.get('/api/v1/indicators/public-debt/observations.csv');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/csv');
  const text = await res.text();
  expect(text.split('\r\n')[0]).toBe('indicator,year,value,estimate_type,source,vintage');
  expect(text).toMatch(/public-debt,2031,[\d.]+,projected,/);
});
