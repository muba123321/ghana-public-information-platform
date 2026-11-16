import type { RegionPoint } from '@gpip/db';

export interface FigureRow {
  year: number;
  value: number | null;
  /** Which geography the figure describes, in words. */
  geography: string;
  former: boolean;
}

/** Oldest first; a figure measured for a former region says so. */
export function figureRows(points: readonly RegionPoint[]): FigureRow[] {
  return [...points]
    .sort((a, b) => a.year - b.year)
    .map((p) => ({
      year: p.year,
      value: p.value,
      geography: p.measuredFor.former ? `figure for the ${p.measuredFor.name}` : p.measuredFor.name,
      former: p.measuredFor.former,
    }));
}
