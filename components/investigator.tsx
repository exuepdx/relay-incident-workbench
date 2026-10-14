"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InvestigationInput, InvestigationResult, ProgressEvent } from "@/lib/contracts";
import { Icon } from "./icons";
import { ReportView } from "./report";
import { RunTimeline, foldTimeline } from "./run-timeline";

type Phase = "idle" | "running" | "completed" | "failed";
type Fault = InvestigationInput["fault"];

/**
 * The right column: start a run, watch its steps stream in, read the report.
 *
 * The browser holds nothing but a run id. Progress comes from the run's
 * persisted stream (replayed on reconnect) and status from the index, so a
 * refresh, a new tab, or another device can pick the run up mid-flight.
 */
export function Investigator({ incidentId, question, demoControls, model, fallbackModels }: { incidentId: string; question: string; demoControls: boolean; model: string; fallbackModels: string[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [fault, setFault] = useState<Fault>("none");
  const generation = useRef(0);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((v) => setAuth(Boolean(v.authenticated)))
      .catch(() => setAuth(false));
  }, []);

  const follow = useCallback(
    async (id: string) => {
      const ticket = ++generation.current;
      setRunId(id);
      setPhase("running");
      setEvents([]);
      setResult(null);
      setError("");
      const controller = new AbortController();
      // 1. Replay and follow the persisted progress stream.
      (async () => {
        try {
          const response = await fetch(`/api/investigations/${id}/events`, { signal: controller.signal, cache: "no-store" });
          if (!response.ok || !response.body) return;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done || ticket !== generation.current) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            const parsed = lines.filter(Boolean).map((l) => JSON.parse(l) as ProgressEvent);
            if (parsed.length) setEvents((prev) => [...prev, ...parsed]);
          }
        } catch {
          /* stream closed; status polling below is authoritative */
        }
      })();
      // 2. Poll status; the index is authoritative for completion.
      for (let i = 0; i < 150 && ticket === generation.current; i++) {
        try {
          const response = await fetch(`/api/investigations/${id}`, { cache: "no-store" });
          const body = await response.json();
          if (ticket !== generation.current) return;
          if (!response.ok) throw new Error(body.error ?? "Could not read the run");
          if (body.status === "completed" && body.result) {
            setResult(body.result);
            setPhase("completed");
            controller.abort();
            router.refresh();
            return;
          }
          if (body.status === "failed" || body.status === "cancelled") {
            setPhase("failed");
            setError("The run stopped without a diagnosis. The timeline shows which step failed; nothing was substituted.");
            controller.abort();
            router.refresh();
            return;
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Connection interrupted; retrying.");
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (ticket === generation.current) {
        setPhase("failed");
        setError("This run is taking longer than expected. It remains in saved investigations; open it there to reconnect.");
        controller.abort();
      }
    },
    [router],
  );

  // Resume from ?run= (saved investigations) on load.
  useEffect(() => {
    const id = search.get("run");
    if (id && id !== runId) void follow(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function start() {
    setError("");
    const response = await fetch("/api/investigations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId, fault }),
    });
    const body = await response.json();
    if (!response.ok) {
      if (response.status === 401) setAuth(false);
      setError(body.error ?? "Could not start the investigation.");
      return;
    }
    router.replace(`/incidents/${incidentId}?run=${body.runId}`, { scroll: false });
    void follow(body.runId);
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not unlock.");
      return;
    }
    setAuth(true);
    setCode("");
  }

  function reset() {
    generation.current++;
    setPhase("idle");
    setRunId(null);
    setEvents([]);
    setResult(null);
    setError("");
    router.replace(`/incidents/${incidentId}`, { scroll: false });
  }

  const terminal = phase === "completed" ? "completed" : phase === "failed" ? "failed" : null;
  const rows = foldTimeline(events, terminal);

  return (
    <section className="panel">
      <div className="panel-head">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="spark">
            <Icon name="spark" size={16} />
          </span>
          <div>
            <h2>Investigate</h2>
            <p>Agent on Vercel · tools read {incidentId} from your telemetry</p>
          </div>
        </div>
        {runId && (
          <button className="btn btn-ghost" onClick={reset}>
            New run
          </button>
        )}
      </div>
      <div className="panel-body">
        {phase === "idle" && (
          <>
            <div className="question">
              <span className="eyebrow">Investigation question</span>
              <p>{question}</p>
            </div>
            {auth === false && (
              <div className="gate">
                <p>
                  <Icon name="lock" size={13} /> Enter the reviewer code once to start investigations for 24 hours.
                </p>
                <form onSubmit={unlock}>
                  <input type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Reviewer access code" aria-label="Reviewer access code" required />
                  <button className="btn btn-primary" type="submit">
                    Unlock
                  </button>
                </form>
              </div>
            )}
            <button className="btn btn-primary btn-lg btn-block" disabled={auth !== true} onClick={start}>
              <Icon name="spark" size={16} /> Run investigation <Icon name="arrow" size={16} />
            </button>
            <p className="note">
              {model} via AI Gateway{fallbackModels.length ? `, falls back to ${fallbackModels[0]}` : ""}. Read-only. About 15 seconds.
            </p>
            {demoControls && (
              <details className="controls">
                <summary>
                  <Icon name="bolt" size={14} /> Test resilience
                </summary>
                <div className="field">
                  <label htmlFor="fault">Break something on purpose</label>
                  <select id="fault" value={fault} onChange={(e) => setFault(e.target.value as Fault)}>
                    <option value="none">Nothing · healthy path</option>
                    <option value="transient">Telemetry API returns 503 once (step retries)</option>
                    <option value="outage">Telemetry API is down (run fails, no model call)</option>
                    <option value="provider-outage">Primary model unavailable (Gateway falls back)</option>
                  </select>
                  <span className="help">Faults are injected at the customer API or at Gateway routing, never in the agent.</span>
                </div>
              </details>
            )}
          </>
        )}

        {phase !== "idle" && (
          <>
            <RunTimeline rows={rows} />
            {phase === "running" && (
              <p className="note">
                <span className="pulse" /> You can refresh or close this tab. The run continues and is listed under saved investigations.
              </p>
            )}
          </>
        )}

        {error && (
          <div className={`alert ${phase === "failed" ? "error" : "info"}`} role="alert">
            <strong>{phase === "failed" ? "No diagnosis" : "Heads up"}</strong>
            {error}
          </div>
        )}

        {result && runId && (
          <>
            <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />
            <ReportView result={result} runId={runId} />
          </>
        )}
      </div>
      {phase === "idle" && (
        <div className="steps-explainer">
          <div>
            <span>01</span> The agent reads the incident record and asks your telemetry for metrics, traces, and changes.
          </div>
          <div>
            <span>02</span> Every tool call is a durable step: retried on 503, resumed after a crash or deploy.
          </div>
          <div>
            <span>03</span> The report is validated against the evidence it read. Your team decides what to do.
          </div>
        </div>
      )}
    </section>
  );
}
