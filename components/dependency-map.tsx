"use client";

import { useId, useState } from "react";
import type { Evidence, Incident, Topology } from "@/lib/contracts";
import { Icon } from "./icons";
import { CitationButton } from "./citation-button";
import { customer } from "@/lib/customer";

const statusLabel = { affected: "Affected", baseline: "Within baseline", unknown: "Unknown" } as const;
// Curated catalog geometry. Connections show dependencies, never inferred causality.
const positions: Record<string, [number, number]> = {
  checkout: [18, 20],
  payments: [82, 20],
  inventory: [18, 52],
  network: [50, 52],
  database: [82, 52],
  underlay: [50, 84],
};
const nodeIcons: Record<string, string> = {
  checkout: "layers",
  payments: "globe",
  inventory: "server",
  network: "network",
  database: "database",
  underlay: "layers",
};

export function handoffText(incident: Incident, topology: Topology, index: number) {
  const h = topology.handoffs[index];
  const node = topology.nodes.find((n) => n.id === h.nodeId)!;
  return [
    `Relay — proposed handoff to ${node.owner}`,
    `Incident: ${incident.id} · ${customer.incidents.find((item) => item.id === incident.id)?.title ?? incident.title}`,
    `Scope: ${topology.scope}`,
    `Window: ${incident.window}`,
    `Next check: ${h.action}`,
    `Why this team: ${h.reason}`,
    `Evidence to seek: ${h.confirm}`,
    `What would challenge it: ${h.challenge}`,
    `Sources: ${h.citations.join(", ")}`,
    "Share this handoff with the named team to confirm ownership and the next check.",
  ].join("\n\n");
}

/** Curated dependency scene with owners, status, and copyable handoffs. */
export function DependencyMap({ incident, evidence }: { incident: Incident; evidence: Evidence[] }) {
  const topology = incident.topology!;
  const arrowId = useId();
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
        <CitationButton key={id} id={id} evidence={evidence} scope="catalog" />
      ))}
    </div>
  );
  return (
    <div className="stack">
      <div className="panel topology-panel">
        <div className="panel-head">
          <div>
            <h2>Service dependencies</h2>
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
          <div className="map-stage">
            <div className="map-coordinates" aria-hidden="true">
              <span>SCENARIO MAP</span>
              <span>{topology.nodes.length.toString().padStart(2, "0")} COMPONENTS</span>
            </div>
            <div className="map" role="group" aria-label="Dependency map; arrows show dependency direction">
              <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" className="map-lines">
                <defs>
                  <marker
                    id={arrowId}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--map-arrow)" />
                  </marker>
                </defs>
                {topology.edges.map((edge) => {
                  const from = positions[edge.from];
                  const to = positions[edge.to];
                  if (!from || !to) return null;
                  const horizontal = from[1] === to[1];
                  const active = edge.from === selected || edge.to === selected;
                  const toUnknown = topology.nodes.find((n) => n.id === edge.to)?.status === "unknown";
                  return (
                    <g key={`${edge.from}-${edge.to}`} className={`map-connection ${active ? "active" : ""}`}>
                      <line
                        x1={from[0] * 10 + (horizontal ? 136 : 0)}
                        y1={from[1] * 10 + (horizontal ? 0 : 125)}
                        x2={to[0] * 10 - (horizontal ? 144 : 0)}
                        y2={to[1] * 10 - (horizontal ? 0 : 135)}
                        markerEnd={`url(#${arrowId})`}
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray={toUnknown ? "4 5" : undefined}
                      />
                    </g>
                  );
                })}
              </svg>
              {topology.nodes.map((n, i) => (
                <button
                  key={n.id}
                  type="button"
                  className={`node ${n.status} ${node.id === n.id ? "selected" : ""}`}
                  style={{
                    left: `${positions[n.id]?.[0] ?? 75}%`,
                    top: `${positions[n.id]?.[1] ?? 38}%`,
                    ["--i" as string]: i,
                  }}
                  aria-pressed={node.id === n.id}
                  onClick={() => setSelected(n.id)}
                >
                  <span className="node-chrome" aria-hidden="true">
                    <Icon name={nodeIcons[n.id] ?? "server"} size={19} />
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  </span>
                  <strong>{n.label}</strong>
                  <span className={`status ${n.status}`}>
                    <i /> {statusLabel[n.status]}
                  </span>
                  <small>{n.owner}</small>
                </button>
              ))}
            </div>
          </div>
          <p className="map-caption">
            Arrows are catalog dependencies, not proven fault propagation. "Within baseline" describes the supplied
            measurements only.
          </p>
          <div className="node-detail" aria-live="polite">
            <div className="node-detail-head">
              <span className="owner-icon">
                <Icon name={nodeIcons[node.id] ?? "server"} size={22} />
              </span>
              <div>
                <span className="eyebrow">Service owner</span>
                <h4>{node.owner}</h4>
              </div>
              <span className="detail-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
            <p>{node.signal}</p>
            <Cites ids={node.citations} />
            <div className="links">
              <span className="eyebrow">Connected systems</span>
              {related.map((edge) => (
                <button
                  key={`${edge.from}-${edge.to}`}
                  onClick={() => setSelected(edge.from === node.id ? edge.to : edge.from)}
                >
                  {topology.nodes.find((n) => n.id === edge.from)?.label} <span>→ {edge.label} →</span>{" "}
                  {topology.nodes.find((n) => n.id === edge.to)?.label}
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
            <h2>Suggested team handoffs</h2>
            <p>Prepared for this scenario. Copy a handoff to share with the named team; no notification is sent.</p>
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
                    <small>
                      {i === 0 ? "START HERE" : "IN PARALLEL"} · {owner.owner}
                    </small>
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
