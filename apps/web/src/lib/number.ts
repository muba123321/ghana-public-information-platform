const full = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

/** 1 decimal place; large counts (population, tonnes) in compact form on axes. */
export function formatValue(v: number, opts: { compact?: boolean } = {}): string {
  return opts.compact && Math.abs(v) >= 100_000 ? compact.format(v) : full.format(v);
}
