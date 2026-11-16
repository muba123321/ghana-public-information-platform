import { describe, expect, it } from 'vitest';
import { buildMap, pointInPath } from './build-map.ts';

const map = buildMap();

describe('buildMap', () => {
  it('produces the 16 regions under our slugs', () => {
    expect(map.regions.map((r) => r.slug).sort()).toEqual(
      [
        'ahafo',
        'ashanti',
        'bono',
        'bono-east',
        'central',
        'eastern',
        'greater-accra',
        'north-east',
        'northern',
        'oti',
        'savannah',
        'upper-east',
        'upper-west',
        'volta',
        'western',
        'western-north',
      ].sort(),
    );
  });

  it('puts every anchor inside its own region', () => {
    for (const r of map.regions) expect(pointInPath(r.d, r.anchor), r.slug).toBe(true);
  });

  it('includes Lake Volta, Lake Bosomtwe and the main rivers', () => {
    expect(map.lakes.map((l) => l.name)).toEqual(
      expect.arrayContaining(['Lake Volta', 'Lake Bosomtwe']),
    );
    expect(new Set(map.rivers.map((r) => r.name))).toEqual(
      new Set(['Black Volta', 'White Volta', 'Oti', 'Volta']),
    );
  });

  it('projects a known place where it belongs', () => {
    // Kumasi (6.69°N, 1.62°W) is in Ashanti.
    const ashanti = map.regions.find((r) => r.slug === 'ashanti');
    expect(pointInPath(ashanti?.d ?? '', map.project(6.69, -1.62))).toBe(true);
  });

  it('is small enough to send with the front page, and credits its sources', () => {
    expect(JSON.stringify({ ...map, project: undefined }).length).toBeLessThan(70_000);
    expect(map.credit).toMatch(/geoBoundaries.*OpenStreetMap.*Natural Earth/);
  });
});
