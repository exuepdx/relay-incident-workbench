/** A compact view of the same supplied p95 series shown in Overview. */
export function MetricSignal({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${28 - (value / max) * 24}`)
    .join(" ");
  return (
    <svg className="metric-signal" viewBox="0 0 100 32" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
