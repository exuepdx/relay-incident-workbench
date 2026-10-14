import type { Incident } from "@/lib/contracts";

/** The representative slow request as a span waterfall; bars grow in on mount. */
export function TraceWaterfall({ incident }: { incident: Incident }) {
  const total = Math.max(...incident.spans.map((s) => s.start + s.duration), 1);
  const scale = Math.ceil(total / 500) * 500;
  return (
    <div>
      <div className="trace-scale">
        <span>Service / operation</span>
        <span>0</span>
        <span>{(scale / 1000).toFixed(1)} s</span>
      </div>
      {incident.spans.map((span, i) => (
        <div className="span-row" key={span.name + i}>
          <div className="span-name" style={{ paddingLeft: Math.min(i, 2) * 10 }}>
            <span className={`dot ${span.color}`} />
            <div>
              <strong>{span.name}</strong>
              <small>{span.service}</small>
            </div>
          </div>
          <div className="span-track">
            <div
              className={`bar ${span.color}`}
              style={{
                left: `${(span.start / scale) * 100}%`,
                width: `${Math.max(0.5, (span.duration / scale) * 100)}%`,
                ["--i" as string]: i,
              }}
            />
          </div>
          <span className="span-ms">{span.duration.toLocaleString()} ms</span>
        </div>
      ))}
    </div>
  );
}
