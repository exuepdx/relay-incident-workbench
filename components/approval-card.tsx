"use client";

import { useState } from "react";
import type { Evidence, MitigationProposal } from "@/lib/contracts";
import { Icon } from "./icons";
import { CitationButton } from "./citation-button";

/**
 * The human in the loop. The run is paused on a workflow hook; the decision
 * resumes it. Nothing happens to any system either way: approval here means
 * "the owner agrees this is the next action", and the report records it.
 */
export function ApprovalCard({
  runId,
  proposal,
  evidence,
  onDecided,
}: {
  runId: string;
  proposal: MitigationProposal;
  evidence: Evidence[];
  onDecided: (decision: "approved" | "declined") => void;
}) {
  const [busy, setBusy] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState("");
  async function decide(decision: "approved" | "declined") {
    setBusy(decision);
    setError("");
    try {
      const response = await fetch(`/api/investigations/${runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Could not send the decision.");
        setBusy(null);
        return;
      }
      onDecided(decision);
    } catch {
      setError("Connection interrupted. Reconnect to check whether the decision was recorded.");
      setBusy(null);
    }
  }
  return (
    <div className="approval" role="region" aria-label="Mitigation proposal awaiting approval">
      <div className="approval-head">
        <span className="chip amber">
          <i /> Awaiting {proposal.owner}
        </span>
        <span className="eyebrow">Proposed mitigation</span>
      </div>
      <h4>{proposal.action}</h4>
      <p>{proposal.rationale}</p>
      <p className="muted">
        <strong>Expected effect: </strong>
        {proposal.expectedEffect}
      </p>
      <div className="cites">
        {proposal.citations.map((id) => (
          <CitationButton key={id} id={id} evidence={evidence} />
        ))}
      </div>
      <div className="approval-actions">
        <button className="btn btn-primary" disabled={busy !== null} onClick={() => decide("approved")}>
          {busy === "approved" ? <span className="spinner" /> : <Icon name="check" size={14} />} Record demo approval
        </button>
        <button className="btn" disabled={busy !== null} onClick={() => decide("declined")}>
          <Icon name="close" size={14} /> Decline
        </button>
      </div>
      <p className="note" style={{ textAlign: "left", margin: "10px 0 0" }}>
        The demo reviewer records a decision; production requires verified owner identity. The durable wait holds no
        running function. Relay never executes changes.
      </p>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
