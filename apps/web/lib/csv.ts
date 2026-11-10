type Cell = string | number | null;

/** Cells a spreadsheet would treat as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(v: Cell): string {
  if (v === null) return '';
  if (typeof v === 'number') return String(v);
  const safe = FORMULA_START.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** RFC 4180 CSV (CRLF line endings) that is safe to open in a spreadsheet. */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return [header, ...rows].map((r) => `${r.map(cell).join(',')}\r\n`).join('');
}
