"use client";

import { useRouter } from "next/navigation";
import type { InvestigationRecord, InvestigationResult } from "@/lib/contracts";
import { ReportView } from "./report";

function Header({ result }: { result: InvestigationResult }) {
  const a = result.accounting;
  const elapsed = Math.round((new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / 100) / 10;
  return (
    <div className="compare-head">
      <div>
        <span className="eyebrow">Served by</span>
        <strong>{a.servedBy ?? "model"}</strong>
        {a.fallbackUsed && <span className="chip amber">fallback used</span>}
      </div>
      <div>
        <span className="eyebrow">Cost</span>
        <strong>{a.totalCostUsd ? `$${Number(a.totalCostUsd).toFixed(4)}` : "n/a"}</strong>
      </div>
      <div>
        <span className="eyebrow">Time</span>
        <strong>{elapsed} s</strong>
      </div>
      <div>
        <span className="eyebrow">Tokens</span>
        <strong>
          {a.totalInputTokens.toLocaleString()} / {a.totalOutputTokens.toLocaleString()}
        </strong>
      </div>
    </div>
  );
}

export function CompareView({
  incidentId,
  runs,
  left,
  right,
  leftId,
  rightId,
}: {
  incidentId: string;
  runs: InvestigationRecord[];
  left: InvestigationResult | null;
  right: InvestigationResult | null;
  leftId: string | null;
  rightId: string | null;
}) {
  const router = useRouter();
  const go = (a: string | null, b: string | null) =>
    router.replace(`/incidents/${incidentId}/compare?a=${a ?? ""}&b=${b ?? ""}`, { scroll: false });
  const label = (r: InvestigationRecord) =>
    `${r.model ?? "model"} · ${new Date(r.createdAt).toLocaleTimeString()} · ${r.costUsd ? `$${Number(r.costUsd).toFixed(4)}` : ""}`;
  if (runs.length < 2) {
    return (
      <div className="panel">
        <div className="panel-body empty">
          Run this incident at least twice, ideally with different models, and come back.
        </div>
      </div>
    );
  }
  return (
    <div className="compare stagger">
      {[
        { id: leftId, result: left, side: "a" as const },
        { id: rightId, result: right, side: "b" as const },
      ].map(({ id, result, side }) => (
        <section className="panel compare-col" key={side}>
          <div className="panel-head">
            <div className="field" style={{ margin: 0, flex: 1 }}>
              <label htmlFor={`pick-${side}`}>Run {side.toUpperCase()}</label>
              <select
                id={`pick-${side}`}
                value={id ?? ""}
                onChange={(e) => (side === "a" ? go(e.target.value, rightId) : go(leftId, e.target.value))}
              >
                {runs.map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {label(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="panel-body">
            {result && id ? (
              <>
                <Header result={result} />
                <ReportView result={result} runId={id} />
              </>
            ) : (
              <p className="empty">No report loaded.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
