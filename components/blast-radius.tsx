"use client";

import { useState } from "react";
import type { Bundle, Topology } from "@/lib/contracts";
import { Icon } from "./icons";

const statusLabels = {
  affected: "Affected",
  baseline: "Within baseline",
  unknown: "Unknown",
};
// The catalog-backed synthetic scene has fixed positions, not inferred topology.
const positions: Record<string, [number, number]> = {
  checkout: [25, 12],
  payments: [75, 12],
  inventory: [25, 38],
  network: [25, 65],
  database: [75, 65],
  underlay: [25, 91],
};

export function handoffText(bundle: Bundle, topology: Topology, index: number) {
  const handoff = topology.handoffs[index];
  const node = topology.nodes.find((n) => n.id === handoff.nodeId)!;
  const sources = handoff.citations.map((id) => {
    const evidence = bundle.evidence.find((e) => e.id === id)!;
    return `${id} — ${evidence.title}: ${evidence.detail}`;
  });
  return [
    `Relay — proposed handoff to ${node.owner}`,
    `Scope: ${topology.scope}`,
    `Window: ${bundle.window}`,
    `Next check: ${handoff.action}`,
    `Why this team: ${handoff.reason}`,
    `Evidence to seek: ${handoff.confirm}`,
    `What would challenge it: ${handoff.challenge}`,
    "Sources:",
    ...sources,
    "Synthetic investigation. No assignment or notification has been sent. This is a proposed check, not a confirmed root cause; operational changes require owner approval.",
  ].join("\n\n");
}

export function BlastRadius({
  bundle,
  retrieved,
  onCite,
}: {
  bundle: Bundle;
  retrieved: boolean;
  onCite: (id: string) => void;
}) {
  const topology = bundle.topology!;
  const [selected, setSelected] = useState("network");
  const [copied, setCopied] = useState("");
  const node =
    topology.nodes.find((n) => n.id === selected) ?? topology.nodes[0];
  const related = topology.edges.filter(
    (e) => e.from === node.id || e.to === node.id,
  );
  const handoff = topology.handoffs.find((h) => h.nodeId === node.id);
  const counts = topology.nodes.reduce(
    (sum, n) => ({ ...sum, [n.status]: sum[n.status] + 1 }),
    { affected: 0, baseline: 0, unknown: 0 },
  );
  function citations(ids: string[], context: string) {
    return (
      <div className="citations">
        {ids.map((id) => (
          <button
            key={id}
            onClick={() => onCite(id)}
            aria-label={`${context}: view evidence ${id}`}
          >
            {id} ↗
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="blast-view">
      <div className="panel blast-panel">
        <div className="blast-heading">
          <div>
            <span className="mini-label">SCOPE BEFORE CAUSE</span>
            <h3>Where the symptoms meet.</h3>
          </div>
          <span className="badge neutral">
            {retrieved ? "Retrieved snapshot" : "Scenario preview"}
          </span>
        </div>
        <p className="blast-scope">{topology.scope}</p>
        <div
          className="blast-legend"
          aria-label="Observed component status counts"
        >
          {Object.entries(counts).map(([status, count]) => (
            <span key={status} className={`node-status ${status}`}>
              <i />
              {count} {statusLabels[status as keyof typeof statusLabels]}
            </span>
          ))}
        </div>
        <div
          className="dependency-map"
          role="group"
          aria-label="Dependency map; arrows show dependency direction, not proven fault propagation"
        >
          <svg
            viewBox="0 0 600 440"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="dependency-lines"
          >
            <defs>
              <marker
                id="dependency-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#aaa0b5" />
              </marker>
            </defs>
            {topology.edges.map((edge) => {
              const from = positions[edge.from],
                to = positions[edge.to];
              if (!from || !to) return null;
              const horizontal = from[1] === to[1];
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={from[0] * 6 + (horizontal ? 119 : 0)}
                  y1={from[1] * 4.4 + (horizontal ? 0 : 38)}
                  x2={to[0] * 6 - (horizontal ? 121 : 0)}
                  y2={to[1] * 4.4 - (horizontal ? 0 : 40)}
                  markerEnd="url(#dependency-arrow)"
                  stroke="#aaa0b5"
                  strokeWidth="1.5"
                  strokeDasharray={edge.to === "underlay" ? "4 4" : undefined}
                />
              );
            })}
          </svg>
          {topology.nodes.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`dependency-node ${n.status} ${node.id === n.id ? "selected" : ""}`}
              style={{
                left: `${positions[n.id]?.[0] ?? 75}%`,
                top: `${positions[n.id]?.[1] ?? 38}%`,
              }}
              aria-pressed={node.id === n.id}
              aria-controls="dependency-detail"
              onClick={() => setSelected(n.id)}
            >
              <span className={`node-status ${n.status}`}>
                <i />
                {statusLabels[n.status]}
              </span>
              <strong>{n.label}</strong>
              <small>{n.owner}</small>
            </button>
          ))}
          <div className="map-annotation">
            <Icon name="info" size={14} />
            <span>
              Follow dependencies.
              <br />
              Validate the cause.
            </span>
          </div>
        </div>
        <p className="map-caption">
          Arrows show catalog dependencies, not proven fault propagation.
          “Within baseline” applies only to the supplied measurements; no team
          is cleared.
        </p>
        <div
          id="dependency-detail"
          className="dependency-detail"
          aria-live="polite"
        >
          <div className="detail-title">
            <div>
              <span className="mini-label">ACCOUNTABLE TEAM</span>
              <h4>{node.owner}</h4>
            </div>
            <span className={`node-status ${node.status}`}>
              <i />
              {statusLabels[node.status]}
            </span>
          </div>
          <p>{node.signal}</p>
          {citations(node.citations, node.label)}
          <div className="dependency-links">
            <span className="mini-label">CONNECTED SYSTEMS</span>
            {related.map((edge) => (
              <button
                key={`${edge.from}-${edge.to}`}
                onClick={() =>
                  setSelected(edge.from === node.id ? edge.to : edge.from)
                }
              >
                {topology.nodes.find((n) => n.id === edge.from)?.label}{" "}
                <span>→ {edge.label} →</span>{" "}
                {topology.nodes.find((n) => n.id === edge.to)?.label}
              </button>
            ))}
          </div>
          {handoff ? (
            <p className="owner-check">
              <strong>Next read-only check</strong>
              {handoff.confirm}
            </p>
          ) : (
            <p className="owner-check">
              <strong>Keep the owner in the loop</strong>Compare the supplied
              signals with broader measurements before expanding or narrowing
              this team’s involvement.
            </p>
          )}
        </div>
      </div>
      <div className="panel handoff-panel">
        <span className="mini-label">COORDINATE THE NEXT CHECK</span>
        <h3>An investigation plan for the war room.</h3>
        <p className="handoff-intro">
          Suggested coordination plan from this evidence snapshot. Copy a brief
          for review; Relay does not assign incidents or notify teams.
        </p>
        {topology.handoffs.map((h, i) => {
          const owner = topology.nodes.find((n) => n.id === h.nodeId)!;
          return (
            <article className="handoff-card" key={h.nodeId}>
              <div className="handoff-top">
                <span className="handoff-number">0{i + 1}</span>
                <div>
                  <small>
                    {i === 0 ? "START HERE" : "IN PARALLEL"} · {owner.owner}
                  </small>
                  <h4>{h.action}</h4>
                </div>
              </div>
              <p>{h.reason}</p>
              {citations(h.citations, h.action)}
              <details>
                <summary>Confirm or challenge this lead</summary>
                <dl>
                  <dt>Evidence to seek</dt>
                  <dd>{h.confirm}</dd>
                  <dt>What would challenge it</dt>
                  <dd>{h.challenge}</dd>
                </dl>
              </details>
              <button
                className="secondary-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      handoffText(bundle, topology, i),
                    );
                    setCopied(`Copied handoff for ${owner.owner}.`);
                  } catch {
                    setCopied(
                      "Clipboard unavailable. Select the handoff text to copy it.",
                    );
                  }
                }}
              >
                <Icon name="copy" size={14} />
                Copy handoff for {owner.owner}
              </button>
            </article>
          );
        })}
        <p className="handoff-feedback" role="status">
          {copied}
        </p>
      </div>
    </div>
  );
}
