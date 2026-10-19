"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InvestigationInput, InvestigationRecord, InvestigationResult, ProgressEvent } from "@/lib/contracts";
import { ApprovalCard } from "./approval-card";
import { Icon } from "./icons";
import { ReportView } from "./report";
import { RunTimeline, foldTimeline } from "./run-timeline";

type Phase = "idle" | "running" | "waiting" | "disconnected" | "completed" | "failed";
type Fault = InvestigationInput["fault"];

/**
 * The right column: start a run, watch its steps stream in, read the report.
 *
 * The browser holds nothing but a run id. Progress comes from the run's
 * persisted stream (replayed on reconnect) and status from the index, so a
 * refresh, a new tab, or another device can pick the run up mid-flight.
 */
export function Investigator({
  incidentId,
  question,
  demoControls,
  model,
  fallbackModels,
  comparisonModels,
}: {
  incidentId: string;
  question: string;
  demoControls: boolean;
  model: string;
  fallbackModels: string[];
  comparisonModels: string[];
}) {
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
  const [chosenModel, setChosenModel] = useState(model);
  const [approval, setApproval] = useState<NonNullable<InvestigationRecord["approval"]> | null>(null);
  const [streamNote, setStreamNote] = useState("");
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const generation = useRef(0);
  const streamAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((v) => setAuth(Boolean(v.authenticated)))
      .catch(() => setAuth(false));
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      streamAbort.current?.abort();
    },
    [],
  );

  const follow = useCallback(
    async (id: string) => {
      const ticket = ++generation.current;
      setRunId(id);
      setPhase("running");
      setEvents([]);
      setResult(null);
      setError("");
      setStreamNote("");
      setApproval(null);
      window.dispatchEvent(new CustomEvent("relay:evidence", { detail: null }));
      // The stream replays persisted chunks and closes itself once the run is
      // terminal, so it is only aborted when the user leaves this run.
      streamAbort.current?.abort();
      const controller = new AbortController();
      streamAbort.current = controller;
      // 1. Replay and follow the persisted progress stream.
      (async () => {
        try {
          const response = await fetch(`/api/investigations/${id}/events`, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (response.status === 404) {
            setStreamNote("The step timeline is unavailable. This report was restored from saved investigation data.");
            return;
          }
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
      while (ticket === generation.current && !controller.signal.aborted) {
        try {
          const response = await fetch(`/api/investigations/${id}`, {
            cache: "no-store",
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
          });
          const body = await response.json();
          if (ticket !== generation.current) return;
          if (!response.ok) throw new Error(body.error ?? "Could not read the run");
          setError("");
          const pending = body.record?.approval?.status === "pending" ? body.record.approval : null;
          setPhase(pending ? "waiting" : "running");
          if (pending?.evidence)
            window.dispatchEvent(
              new CustomEvent("relay:evidence", { detail: { evidence: pending.evidence, runId: id } }),
            );
          setApproval((prev) => (pending ? pending : prev && prev.status === "pending" ? null : prev));
          if (body.status === "completed" && body.result) {
            setResult(body.result);
            window.dispatchEvent(
              new CustomEvent("relay:evidence", { detail: { evidence: body.result.evidence, runId: id } }),
            );
            controller.abort();
            setPhase("completed");
            router.refresh();
            return;
          }
          if (body.status === "failed" || body.status === "cancelled") {
            controller.abort();
            setPhase("failed");
            setError(
              "The run stopped without a diagnosis. The timeline shows which step failed; nothing was substituted.",
            );
            router.refresh();
            return;
          }
        } catch (e) {
          if (ticket !== generation.current || controller.signal.aborted) return;
          setPhase("disconnected");
          setError(e instanceof Error ? e.message : "Connection interrupted; retrying.");
        }
        await new Promise((r) => setTimeout(r, 1500));
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
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setError("");
    const input = JSON.stringify({ incidentId, fault, ...(chosenModel !== model ? { model: chosenModel } : {}) });
    const storageKey = `relay:start:${input}`;
    let requestKey = sessionStorage.getItem(storageKey);
    if (!requestKey) {
      requestKey = crypto.randomUUID();
      sessionStorage.setItem(storageKey, requestKey);
    }
    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: input,
      });
      const body = await response.json();
      if (!response.ok || !body.runId) {
        if (response.status === 401) setAuth(false);
        setError(body.error ?? "Start not confirmed. Retry to reconnect; check saved runs before starting another.");
        return;
      }
      sessionStorage.removeItem(storageKey);
      router.replace(`/incidents/${incidentId}?run=${body.runId}`, { scroll: false });
      void follow(body.runId);
    } catch {
      setError(
        "Connection interrupted. Retry to reconnect using the same request; a second run will not be dispatched.",
      );
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not unlock.");
      return;
    }
    setAuth(true);
    setCode("");
  }

  function reset() {
    streamAbort.current?.abort();
    generation.current++;
    window.dispatchEvent(new CustomEvent("relay:evidence", { detail: null }));
    setPhase("idle");
    setApproval(null);
    setRunId(null);
    setEvents([]);
    setResult(null);
    setError("");
    router.replace(`/incidents/${incidentId}`, { scroll: false });
  }

  const terminal = phase === "completed" ? "completed" : phase === "failed" ? "failed" : null;
  const rows = foldTimeline(events, terminal);

  return (
    <section className="panel investigation-panel">
      <div className="panel-head">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="spark">
            <Icon name="spark" size={16} />
          </span>
          <div>
            <span className="eyebrow panel-kicker">03 / REASONING WORKSPACE</span>
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
        {phase === "running" && <div className="progress" aria-hidden="true" />}
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
                  <input
                    type="password"
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Reviewer access code"
                    aria-label="Reviewer access code"
                    required
                  />
                  <button className="btn btn-primary" type="submit">
                    Unlock
                  </button>
                </form>
              </div>
            )}
            <button
              className="btn btn-primary btn-lg btn-block run"
              disabled={auth !== true || starting}
              onClick={start}
            >
              <Icon name="spark" size={16} /> {starting ? "Starting…" : "Run investigation"}{" "}
              <Icon name="arrow" size={16} />
            </button>
            <div className="field model-pick">
              <label htmlFor="model">Model</label>
              <select id="model" value={chosenModel} onChange={(e) => setChosenModel(e.target.value)}>
                <option value={model}>{model} · default</option>
                {comparisonModels
                  .filter((m) => m !== model)
                  .map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
              </select>
            </div>
            <p className="note">
              {chosenModel} via AI Gateway{fallbackModels.length ? `, falls back to ${fallbackModels[0]}` : ""}. Reads
              telemetry; never executes changes. Duration and cost are recorded per run.
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
                    <option value="provider-outage">Primary unavailable (test candidate fallback)</option>
                    <option value="pause">Hold before synthesis so you can redeploy mid-run</option>
                  </select>
                  <span className="help">
                    Faults are injected at the customer API or at Gateway routing, never in the agent.
                  </span>
                </div>
              </details>
            )}
          </>
        )}

        {phase !== "idle" && (
          <>
            <RunTimeline rows={rows} />
            {approval?.status === "pending" && runId && (
              <ApprovalCard
                runId={runId}
                proposal={approval.proposal}
                evidence={approval.evidence ?? []}
                onDecided={() => setApproval(null)}
              />
            )}
            {streamNote && <p className="note">{streamNote}</p>}
            {["running", "waiting", "disconnected"].includes(phase) && (
              <p className="note">
                <span className="pulse" />{" "}
                {phase === "waiting"
                  ? "Waiting for a demo approval decision. "
                  : phase === "disconnected"
                    ? "Reconnecting; this is not a run failure. "
                    : ""}
                You can refresh or close this tab. The run continues and is listed under saved investigations.
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
            <a className="btn btn-block" href={`/incidents/${incidentId}/compare?a=${runId}`} style={{ marginTop: 12 }}>
              Compare with another model <Icon name="arrow" size={14} />
            </a>
          </>
        )}
      </div>
      {phase === "idle" && (
        <div className="steps-explainer">
          <div>
            <span>01</span> The agent reads the incident record and asks your telemetry for metrics, traces, and
            changes.
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
