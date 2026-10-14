"use client";

import { useState } from "react";
import type { InvestigationResult } from "@/lib/contracts";
import { Icon } from "./icons";
import { cite } from "./evidence-tabs";

export function ReportView({ result, runId }: { result: InvestigationResult; runId: string }) {
  const [copied, setCopied] = useState(false);
  const { report, accounting } = result;
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relay-${result.incidentId}-${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="report">
      <div className="report-top">
        <span className="chip violet">
          <Icon name="spark" size={12} /> Draft · review before sharing
        </span>
        <button className="icon-btn" onClick={download} aria-label="Download investigation JSON">
          <Icon name="download" size={16} />
        </button>
      </div>
      <div>
        <span className="assessment">
          {report.assessment === "insufficient-evidence"
            ? "Insufficient evidence"
            : "Supported hypothesis · not confirmed"}
        </span>
        <h3>{report.title}</h3>
      </div>
      <p className="summary">{report.summary}</p>
      <h4>What the evidence says</h4>
      {report.findings.map((f, i) => (
        <div className="finding" key={i}>
          <span className="n">0{i + 1}</span>
          <div>
            <p>{f.text}</p>
            <div className="cites">
              {f.citations.map((id) => (
                <button key={id} className="cite" onClick={() => cite(id)} aria-label={`View evidence ${id}`}>
                  {id} ↗
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div className="uncertainty">
        <Icon name="info" size={16} />
        <span>{report.uncertainty}</span>
      </div>
      <h4>Recommended next steps</h4>
      <ol className="next-steps">
        {report.nextSteps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="update">
        <header>
          <span className="eyebrow">Customer update</span>
          <button
            className="icon-btn"
            aria-label="Copy customer update"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(report.customerUpdate);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard unavailable */
              }
            }}
          >
            <Icon name={copied ? "check" : "copy"} size={15} />
          </button>
        </header>
        <p>{report.customerUpdate}</p>
      </div>
      <details className="accounting">
        <summary>
          Run accounting · {accounting.servedBy ?? "model"} ·{" "}
          {accounting.totalCostUsd ? `$${Number(accounting.totalCostUsd).toFixed(4)}` : "cost n/a"}
        </summary>
        <dl>
          <dt>Served by</dt>
          <dd>
            {accounting.servedBy ?? "—"}
            {accounting.fallbackUsed ? " · fallback used" : ""}
          </dd>
          <dt>Model steps</dt>
          <dd>{accounting.modelSteps.length}</dd>
          <dt>Tool calls</dt>
          <dd>{accounting.modelSteps.flatMap((s) => s.toolCalls).join(", ") || "—"}</dd>
          <dt>Tokens in / out</dt>
          <dd>
            {accounting.totalInputTokens.toLocaleString()} / {accounting.totalOutputTokens.toLocaleString()}
          </dd>
          <dt>Gateway cost</dt>
          <dd>{accounting.totalCostUsd ? `$${accounting.totalCostUsd}` : "not returned"}</dd>
          <dt>Elapsed</dt>
          <dd>
            {Math.round((new Date(accounting.completedAt).getTime() - new Date(accounting.startedAt).getTime()) / 100) /
              10}{" "}
            s
          </dd>
          <dt>Run</dt>
          <dd>{runId}</dd>
        </dl>
        {accounting.modelSteps.some((s) => s.modelAttempts.length) && (
          <div className="attempts" aria-label="Model attempts">
            {accounting.modelSteps.flatMap((s, i) =>
              s.modelAttempts.map((a, j) => (
                <div key={`${i}-${j}`} className={a.success ? "ok" : "fail"}>
                  step {i + 1} · {a.model} via {a.provider ?? "?"} ·{" "}
                  {a.success ? "ok" : `failed: ${a.error ?? "unavailable"}`}
                </div>
              )),
            )}
          </div>
        )}
        <p className="muted" style={{ fontSize: "var(--text-xs)", marginTop: 8 }}>
          Gateway cost excludes Functions and Workflows usage.
        </p>
      </details>
    </div>
  );
}
