import { placeSeeds } from '@gpip/db/node';
import { describe, expect, it } from 'vitest';
import { buildMap, pointInPath } from './build-map.ts';

describe('places on the map', () => {
  const map = buildMap();
  it.each(placeSeeds.map((p) => [p.name, p] as const))('%s lies inside its region', (_n, p) => {
    const region = map.regions.find((r) => r.slug === p.regionSlug);
    expect(region, p.regionSlug).toBeDefined();
    expect(pointInPath(region?.d ?? '', map.project(p.lat, p.lon))).toBe(true);
  });
});
