"use client";

import { useState } from "react";
import type { Incident } from "@/lib/contracts";

/** p95 latency over the incident window: drawn on mount, inspectable on hover. */
export function LatencyChart({ incident }: { incident: Incident }) {
  const values = incident.series;
  const max = Math.max(...values, 1) * 1.1;
  const w = 680;
  const h = 220;
  const left = 48;
  const right = 20;
  const top = 24;
  const bottom = 40;
  const x = (i: number) => left + (i / (values.length - 1)) * (w - left - right);
  const y = (v: number) => top + (1 - v / max) * (h - top - bottom);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, 0.33, 0.66, 1].map((f) => ({ v: Math.round(max * f), y: y(max * f) }));
  const changeAt = x(Math.floor(values.length * 0.45));
  const [hover, setHover] = useState<number | null>(null);

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * w;
    const i = Math.round(((px - left) / (w - left - right)) * (values.length - 1));
    setHover(Math.max(0, Math.min(values.length - 1, i)));
  }
  const minutesAgo = (i: number) => Math.round(30 - (i / (values.length - 1)) * 30);

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Checkout p95 latency rises from ${incident.kpis.baselineMs} to ${incident.kpis.p95Ms} milliseconds over the window.`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6d4fd2" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6d4fd2" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="45%" stopColor="#6d4fd2" />
            <stop offset="100%" stopColor="#b4432b" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t.v}>
            <line x1={left} x2={w - right} y1={t.y} y2={t.y} className="chart-grid" strokeDasharray="3 4" />
            <text x={left - 8} y={t.y + 4} textAnchor="end" className="chart-label">
              {t.v >= 1000 ? `${(t.v / 1000).toFixed(1)}s` : `${t.v}ms`}
            </text>
          </g>
        ))}
        <line x1={changeAt} x2={changeAt} y1={top - 6} y2={h - bottom} stroke="#c9bfe0" strokeDasharray="4 4" />
        <text x={changeAt} y={top - 10} textAnchor="middle" className="chart-label">
          change window
        </text>
        <polygon
          className="chart-area"
          points={`${x(0)},${h - bottom} ${points} ${x(values.length - 1)},${h - bottom}`}
          fill="url(#fill)"
        />
        <polyline
          className="chart-line"
          pathLength={1}
          points={points}
          fill="none"
          stroke="url(#stroke)"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle className="chart-ring" cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="7" />
        <circle
          className="chart-end"
          cx={x(values.length - 1)}
          cy={y(values[values.length - 1])}
          r="4.5"
          fill="#b4432b"
          stroke="#fff"
          strokeWidth="2"
        />
        {hover !== null && (
          <g>
            <line className="chart-crosshair" x1={x(hover)} x2={x(hover)} y1={top} y2={h - bottom} />
            <circle cx={x(hover)} cy={y(values[hover])} r="4" fill="#fff" stroke="#6d4fd2" strokeWidth="2" />
          </g>
        )}
        {["−30 min", "−20 min", "−10 min", "now"].map((label, i) => (
          <text
            key={label}
            x={x(Math.round((i / 3) * (values.length - 1)))}
            y={h - 12}
            textAnchor={i === 3 ? "end" : i === 0 ? "start" : "middle"}
            className="chart-label"
          >
            {label}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(values[hover]) / h) * 100}%` }}
        >
          {values[hover].toLocaleString()} ms · −{minutesAgo(hover)} min
        </div>
      )}
    </div>
  );
}
