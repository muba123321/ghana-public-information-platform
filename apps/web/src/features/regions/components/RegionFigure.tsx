import type { RegionPoint } from '@gpip/db';
import { NotAvailable } from '@/components/ui/NotAvailable';
import { formatValue } from '@/features/indicators';
import { figureRows } from '../region-figures';
import styles from './RegionFigure.module.css';

interface Props {
  code: string;
  name: string;
  unit: string;
  definition: string;
  points: RegionPoint[];
  /** Year the region was created (2019 split), drawn as a marker; null for original regions. */
  createdYear: number | null;
}

const W = 560;
const H = 170;
const PAD = { l: 44, r: 16, t: 14, b: 26 };

/**
 * One regional measure over survey years. Points are not joined (surveys are years apart). Figures
 * measured for a former region are hollow and labelled; the 2019 split is marked.
 */
export function RegionFigure({ code, name, unit, definition, points, createdYear }: Props) {
  const rows = figureRows(points);
  const known = rows.filter((r): r is typeof r & { value: number } => r.value !== null);
  const years = rows.map((r) => r.year);
  const [y0, y1] = [Math.min(...years, createdYear ?? 9999), Math.max(...years, createdYear ?? 0)];
  const max = unit.includes('%') ? 100 : Math.max(...known.map((r) => r.value), 1) * 1.1;
  const x = (year: number) => PAD.l + ((year - y0) / Math.max(1, y1 - y0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  return (
    <section aria-labelledby={`fig-${code}`} className={styles.figure}>
      <h3 id={`fig-${code}`} className={styles.title}>
        {name} <span className={styles.unit}>({unit})</span>
      </h3>
      <p className={styles.definition}>{definition}</p>
      {known.length === 0 ? (
        <p className={styles.empty}>
          <NotAvailable what={name} />: no figures published for this region yet.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={styles.chart}
          role="img"
          aria-label={`${name} in survey years ${known.map((r) => r.year).join(', ')}. Hollow points are figures for the former region. The table lists every figure.`}
        >
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className={styles.axis} />
          {createdYear !== null && (
            <g className={styles.split}>
              <line x1={x(createdYear)} x2={x(createdYear)} y1={PAD.t} y2={y(0)} />
              <text x={x(createdYear) + 4} y={PAD.t + 10}>
                Region created {createdYear}
              </text>
            </g>
          )}
          {known.map((r) => (
            <g key={`${r.year}-${r.geography}`}>
              <circle
                cx={x(r.year)}
                cy={y(r.value)}
                r={5}
                className={r.former ? styles.former : styles.own}
              />
              <text x={x(r.year)} y={y(r.value) - 9} textAnchor="middle" className={styles.value}>
                {formatValue(r.value)}
              </text>
              <text x={x(r.year)} y={H - 8} textAnchor="middle" className={styles.year}>
                {r.year}
              </text>
            </g>
          ))}
        </svg>
      )}
      {rows.length > 0 && (
        <details>
          <summary>Show the figures</summary>
          <table className="series-table">
            <thead>
              <tr>
                <th scope="col">Survey year</th>
                <th scope="col">Value</th>
                <th scope="col">Geography</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.year}-${r.geography}`}>
                  <td>{r.year}</td>
                  <td>{r.value === null ? <NotAvailable what={name} /> : formatValue(r.value)}</td>
                  <td>{r.geography}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
