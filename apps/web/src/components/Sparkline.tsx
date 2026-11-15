/** Tiny server-rendered trend line; breaks at missing years, and shows survey-only series as dots. */
export function Sparkline({
  values,
  label,
  sparse = false,
}: {
  values: (number | null)[];
  label: string;
  sparse?: boolean;
}) {
  const W = 120;
  const H = 32;
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return <svg width={W} height={H} role="img" aria-label={label} />;
  const min = Math.min(...present);
  const max = Math.max(...present);
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * (W - 4) + 2);
  const y = (v: number) => (max === min ? H / 2 : H - 3 - ((v - min) / (max - min)) * (H - 6));

  if (sparse) {
    return (
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className="sparkline"
      >
        {values.map((v, i) =>
          v === null ? null : <circle key={x(i)} cx={x(i)} cy={y(v)} r="2.5" fill="currentColor" />,
        )}
      </svg>
    );
  }

  const runs: string[] = [];
  let current = '';
  values.forEach((v, i) => {
    if (v === null) {
      if (current) runs.push(current);
      current = '';
      return;
    }
    current += `${current ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (current) runs.push(current);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="sparkline"
    >
      {runs.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
