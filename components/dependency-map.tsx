"use client";

import { useState } from "react";
import type { Incident, Topology } from "@/lib/contracts";
import { Icon } from "./icons";
import { cite } from "./evidence-tabs";

const statusLabel = { affected: "Affected", baseline: "Within baseline", unknown: "Unknown" } as const;
// Fixed positions for the curated six-node scene.
const positions: Record<string, [number, number]> = { checkout: [25, 12], payments: [75, 12], inventory: [25, 38], network: [25, 65], database: [75, 65], underlay: [25, 91] };

export function handoffText(incident: Incident, topology: Topology, index: number) {
  const h = topology.handoffs[index];
  const node = topology.nodes.find((n) => n.id === h.nodeId)!;
  return [
    `Relay — proposed handoff to ${node.owner}`,
    `Incident: ${incident.id} · ${incident.title}`,
    `Scope: ${topology.scope}`,
    `Window: ${incident.window}`,
    `Next check: ${h.action}`,
    `Why this team: ${h.reason}`,
    `Evidence to seek: ${h.confirm}`,
    `What would challenge it: ${h.challenge}`,
    `Sources: ${h.citations.join(", ")}`,
    "Proposed check, not an assignment. Operational changes require the service owner's approval.",
  ].join("\n\n");
}

/** Curated dependency scene with owners, status, and copyable handoffs. */
export function DependencyMap({ incident }: { incident: Incident }) {
  const topology = incident.topology!;
  const [selected, setSelected] = useState(topology.handoffs[0]?.nodeId ?? topology.nodes[0].id);
  const [copied, setCopied] = useState("");
  const node = topology.nodes.find((n) => n.id === selected) ?? topology.nodes[0];
  const related = topology.edges.filter((e) => e.from === node.id || e.to === node.id);
  const handoff = topology.handoffs.find((h) => h.nodeId === node.id);
  const counts = { affected: 0, baseline: 0, unknown: 0 };
  for (const n of topology.nodes) counts[n.status]++;
  const Cites = ({ ids }: { ids: string[] }) => (
    <div className="cites">
      {ids.map((id) => (
        <button key={id} className="cite" onClick={() => cite(id)} aria-label={`View evidence ${id}`}>
          {id} ↗
        </button>
      ))}
    </div>
  );
  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Where the symptoms meet</h2>
            <p>{topology.scope}</p>
          </div>
        </div>
        <div className="panel-body" style={{ paddingTop: 8 }}>
          <div className="map-legend" aria-label="Component status counts">
            {(Object.keys(counts) as Array<keyof typeof counts>).map((s) => (
              <span key={s} className={`status ${s}`}>
                <i /> {counts[s]} {statusLabel[s]}
              </span>
            ))}
          </div>
          <div className="map" role="group" aria-label="Dependency map; arrows show dependency direction">
            <svg viewBox="0 0 600 440" preserveAspectRatio="none" aria-hidden="true" className="map-lines">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a89fb8" />
                </marker>
              </defs>
              {topology.edges.map((edge) => {
                const from = positions[edge.from];
                const to = positions[edge.to];
                if (!from || !to) return null;
                const horizontal = from[1] === to[1];
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={from[0] * 6 + (horizontal ? 119 : 0)}
                    y1={from[1] * 4.4 + (horizontal ? 0 : 38)}
                    x2={to[0] * 6 - (horizontal ? 121 : 0)}
                    y2={to[1] * 4.4 - (horizontal ? 0 : 40)}
                    markerEnd="url(#arrow)"
                    stroke="#a89fb8"
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
                className={`node ${node.id === n.id ? "selected" : ""}`}
                style={{ left: `${positions[n.id]?.[0] ?? 75}%`, top: `${positions[n.id]?.[1] ?? 38}%` }}
                aria-pressed={node.id === n.id}
                onClick={() => setSelected(n.id)}
              >
                <span className={`status ${n.status}`}>
                  <i /> {statusLabel[n.status]}
                </span>
                <strong>{n.label}</strong>
                <small>{n.owner}</small>
              </button>
            ))}
          </div>
          <p className="map-caption">Arrows are catalog dependencies, not proven fault propagation. "Within baseline" describes the supplied measurements only.</p>
          <div className="node-detail" aria-live="polite">
            <span className="eyebrow">Accountable team</span>
            <h4>{node.owner}</h4>
            <p>{node.signal}</p>
            <Cites ids={node.citations} />
            <div className="links">
              <span className="eyebrow">Connected systems</span>
              {related.map((edge) => (
                <button key={`${edge.from}-${edge.to}`} onClick={() => setSelected(edge.from === node.id ? edge.to : edge.from)}>
                  {topology.nodes.find((n) => n.id === edge.from)?.label} <span>→ {edge.label} →</span> {topology.nodes.find((n) => n.id === edge.to)?.label}
                </button>
              ))}
            </div>
            {handoff && (
              <p>
                <strong>Next read-only check: </strong>
                {handoff.confirm}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Coordinate the next check</h2>
            <p>Copy a brief for a team. Relay proposes; it does not assign or notify.</p>
          </div>
        </div>
        <div className="panel-body handoffs">
          {topology.handoffs.map((h, i) => {
            const owner = topology.nodes.find((n) => n.id === h.nodeId)!;
            return (
              <article className="handoff" key={h.nodeId}>
                <div className="handoff-top">
                  <span className="handoff-n">0{i + 1}</span>
                  <div>
                    <small>{i === 0 ? "START HERE" : "IN PARALLEL"} · {owner.owner}</small>
                    <h4>{h.action}</h4>
                  </div>
                </div>
                <p>{h.reason}</p>
                <Cites ids={h.citations} />
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
                  className="btn btn-block"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(handoffText(incident, topology, i));
                      setCopied(`Copied the handoff for ${owner.owner}.`);
                    } catch {
                      setCopied("Clipboard unavailable. Select the text to copy it.");
                    }
                  }}
                >
                  <Icon name="copy" size={14} /> Copy handoff for {owner.owner}
                </button>
              </article>
            );
          })}
          <p className="muted" role="status" style={{ minHeight: 18, fontSize: "var(--text-sm)" }}>
            {copied}
          </p>
        </div>
      </div>
    </div>
  );
}
