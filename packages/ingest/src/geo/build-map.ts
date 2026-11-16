import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Builds the front-page map from the committed inputs in packages/ingest/geo (see its README for
 * sources and licences): projected, simplified region outlines with an interior anchor each, plus
 * Lake Volta, Lake Bosomtwe and the Volta rivers. Output is static JSON for the web app.
 */

type Pt = [number, number];
type Ring = Pt[];

export interface MapData {
  w: number;
  h: number;
  regions: { slug: string; name: string; d: string; cx: number; cy: number; anchor: Pt }[];
  lakes: { name: string; d: string }[];
  rivers: { name: string; d: string }[];
  credit: string;
  /** Projection settings, so the site can place a latitude/longitude on the map. */
  proj: { lon0: number; lat1: number; k: number; sx: number };
  /** Latitude/longitude → map coordinates (for places and products). Not serialised. */
  project: (lat: number, lon: number) => Pt;
}

const GEO = (file: string) => fileURLToPath(new URL(`../../geo/${file}`, import.meta.url));
const WIDTH = 520;
const TOLERANCE = 0.6;
const BOX = { lon0: -3.4, lat0: 4.6, lon1: 1.3, lat1: 11.3 };
const RIVER_NAMES: Record<string, string> = {
  Mouhoun: 'Black Volta',
  Nakanbé: 'White Volta',
  Oti: 'Oti',
  Volta: 'Volta',
};
export const CREDIT =
  'Boundaries: geoBoundaries (CC BY-SA 2.0), © OpenStreetMap contributors (ODbL). Water: Natural Earth.';

interface Feature {
  properties: Record<string, string | null>;
  geometry: { type: string; coordinates: unknown } | null;
}
const read = (file: string) =>
  JSON.parse(readFileSync(GEO(file), 'utf8')) as { features: Feature[] };

function rings(g: Feature['geometry']): Ring[] {
  if (!g) return [];
  const c = g.coordinates as never;
  if (g.type === 'Polygon') return [(c as Ring[])[0] as Ring];
  if (g.type === 'MultiPolygon') return (c as Ring[][]).map((p) => p[0] as Ring);
  if (g.type === 'LineString') return [c as Ring];
  if (g.type === 'MultiLineString') return c as Ring[];
  return [];
}

function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0] as Pt, pts.at(-1) as Pt];
  let max = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i] as Pt;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1);
    if (d > max) [max, idx] = [d, i];
  }
  if (max <= eps) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

/** Closed rings start and end on the same point, so simplify each half separately. */
const simplifyRing = (r: Ring) => {
  const h = Math.floor(r.length / 2);
  return [
    ...simplify(r.slice(0, h + 1), TOLERANCE).slice(0, -1),
    ...simplify(r.slice(h), TOLERANCE),
  ];
};

const toPath = (rs: Ring[], close: boolean) =>
  rs
    .map(
      (r) =>
        `M${r.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}${close ? 'Z' : ''}`,
    )
    .join('');

/** Rings of an "M…L…Z" path (as written by toPath). */
function parsePath(d: string): Ring[] {
  return d
    .split('M')
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/Z$/, '')
        .split('L')
        .map((p) => p.split(',').map(Number) as Pt),
    );
}

/** Even-odd point-in-polygon over every ring of a path. */
export function pointInPath(d: string, [x, y]: Pt): boolean {
  let inside = false;
  for (const ring of parsePath(d)) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] as Pt;
      const [xj, yj] = ring[j] as Pt;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function distanceToEdges(rs: Ring[], [x, y]: Pt): number {
  let best = Number.POSITIVE_INFINITY;
  for (const r of rs) {
    for (let i = 0; i < r.length - 1; i++) {
      const [ax, ay] = r[i] as Pt;
      const [bx, by] = r[i + 1] as Pt;
      const len = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len));
      best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
    }
  }
  return best;
}

/** The interior point furthest from the edges (grid search): where map figures stand. */
function interiorAnchor(d: string): Pt {
  const rs = parsePath(d);
  const all = rs.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best: Pt = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestD = -1;
  for (let i = 0; i <= 40; i++) {
    for (let j = 0; j <= 40; j++) {
      const p: Pt = [x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * j) / 40];
      if (!pointInPath(d, p)) continue;
      const dist = distanceToEdges(rs, p);
      if (dist > bestD) [best, bestD] = [p, dist];
    }
  }
  return [Number(best[0].toFixed(1)), Number(best[1].toFixed(1))];
}

function centroid(rs: Ring[]): Pt {
  let [cx, cy, area] = [0, 0, 0];
  for (const r of rs) {
    for (let i = 0; i < r.length - 1; i++) {
      const [x1, y1] = r[i] as Pt;
      const [x2, y2] = r[i + 1] as Pt;
      const c = x1 * y2 - x2 * y1;
      area += c;
      cx += (x1 + x2) * c;
      cy += (y1 + y2) * c;
    }
  }
  return [Number((cx / (3 * area)).toFixed(1)), Number((cy / (3 * area)).toFixed(1))];
}

export function buildMap(): MapData {
  const boundaries = read('geoBoundaries-GHA-ADM1_simplified.geojson').features;
  const all = boundaries.flatMap((f) => rings(f.geometry)).flat();
  const lon0 = Math.min(...all.map((p) => p[0]));
  const lon1 = Math.max(...all.map((p) => p[0]));
  const lat0 = Math.min(...all.map((p) => p[1]));
  const lat1 = Math.max(...all.map((p) => p[1]));
  const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
  const sx = WIDTH / ((lon1 - lon0) * k);
  const project = (lat: number, lon: number): Pt => [(lon - lon0) * k * sx, (lat1 - lat) * sx];
  const proj = (r: Ring): Ring => r.map(([lon, lat]) => project(lat, lon));

  const regions = boundaries.map((f) => {
    const name = String(f.properties.shapeName).replace(/ Region$/, '');
    const rs = rings(f.geometry)
      .map((r) => simplifyRing(proj(r)))
      .filter((r) => r.length >= 4);
    const d = toPath(rs, true);
    const [cx, cy] = centroid(rs);
    return {
      slug: name.toLowerCase().replace(/ /g, '-'),
      name,
      d,
      cx,
      cy,
      anchor: interiorAnchor(d),
    };
  });

  const inBox = ([lon, lat]: Pt) =>
    lon >= BOX.lon0 && lon <= BOX.lon1 && lat >= BOX.lat0 && lat <= BOX.lat1;
  const lakes = read('ne_10m_lakes.gha.geojson').features.map((f) => ({
    name: String(f.properties.name),
    d: toPath(
      rings(f.geometry).map((r) => simplifyRing(proj(r))),
      true,
    ),
  }));
  const [bx, by] = project(6.505, -1.41);
  lakes.push({
    name: 'Lake Bosomtwe',
    d: `M${(bx - 5).toFixed(1)},${by.toFixed(1)}a5,4.4 0 1,0 10,0a5,4.4 0 1,0 -10,0Z`,
  });
  const rivers = read('ne_10m_rivers.gha.geojson').features.flatMap((f) => {
    const name = RIVER_NAMES[String(f.properties.name)];
    if (!name) return [];
    return rings(f.geometry)
      .map((r) => r.filter(inBox))
      .filter((r) => r.length > 2)
      .map((r) => ({ name, d: toPath([simplify(proj(r), TOLERANCE)], false) }));
  });

  return {
    w: WIDTH,
    h: Math.round((lat1 - lat0) * sx),
    regions,
    lakes,
    rivers,
    credit: CREDIT,
    proj: { lon0, lat1, k, sx },
    project,
  };
}
