"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, Logo } from "./icons";
import { scenarios } from "@/lib/scenarios";
import {
  bundleSchema,
  type ScenarioId,
  type InvestigationResult,
  type InvestigationInput,
} from "@/lib/contracts";
import fixtures from "@/mock/data.json";

type SavedRun = {
  runId: string;
  runToken: string;
  scenario: ScenarioId;
  mode: "live" | "sample";
  date: string;
};
const historyKey = "relay-runs-v1";

function Chart({ scenario }: { scenario: ScenarioId }) {
  const values = scenarios[scenario].series;
  const points = values
    .map((v, i) => `${46 + i * 35},${170 - (v / 3500) * 140}`)
    .join(" ");
  return (
    <svg
      className="latency-chart"
      viewBox="0 0 676 215"
      role="img"
      aria-label={`Synthetic checkout p95 latency rises from ${scenarios[scenario].baseline} to ${scenarios[scenario].latency} milliseconds.`}
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7961cc" stopOpacity=".15" />
          <stop offset="100%" stopColor="#7961cc" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 77, 124, 171].map((y, i) => (
        <g key={y}>
          <line
            x1="46"
            x2="647"
            y1={y}
            y2={y}
            stroke="#eeedf1"
            strokeDasharray="3 4"
          />
          <text x="0" y={y + 4} className="chart-label">
            {["3.5 s", "2.3 s", "1.2 s", "0"][i]}
          </text>
        </g>
      ))}
      <line
        x1="326"
        x2="326"
        y1="17"
        y2="174"
        stroke="#c9c0db"
        strokeDasharray="4 4"
      />
      <rect x="269" y="0" width="114" height="23" rx="5" fill="#f4f1fa" />
      <text x="326" y="15" textAnchor="middle" className="chart-label">
        Change window
      </text>
      <polygon points={`46,171 ${points} 641,171`} fill="url(#chart-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke="#7961cc"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle
        cx="641"
        cy={170 - (values[values.length - 1] / 3500) * 140}
        r="4"
        fill="#7961cc"
        stroke="white"
        strokeWidth="2"
      />
      {["−30 min", "−20 min", "−10 min", "Incident end"].map((label, i) => (
        <text
          key={label}
          x={46 + i * 198}
          y="202"
          textAnchor={i === 3 ? "end" : "start"}
          className="chart-label"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

export function Workbench() {
  const [scenario, setScenario] = useState<ScenarioId>("checkout");
  const [tab, setTab] = useState("overview");
  const [mode, setMode] = useState<"sample" | "live">("sample");
  const [fault, setFault] = useState<InvestigationInput["fault"]>("none");
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [activeRun, setActiveRun] = useState<SavedRun | null>(null);
  const [history, setHistory] = useState<SavedRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [auth, setAuth] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const generation = useRef(0);
  const active = scenarios[scenario];
  const bundle = result?.bundle ?? bundleSchema.parse(fixtures[scenario]);

  useEffect(() => {
    if (!showHistory) return;
    const previous = document.activeElement as HTMLElement | null;
    function trapFocus(event: KeyboardEvent) {
      if (event.key === "Escape") setShowHistory(false);
      if (event.key !== "Tab") return;
      const buttons = [
        ...document.querySelectorAll<HTMLButtonElement>(
          ".history-dialog button",
        ),
      ];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      previous?.focus();
    };
  }, [showHistory]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || "[]");
      if (Array.isArray(stored))
        setHistory(
          stored
            .filter((r) => r.runId && r.runToken && r.scenario in scenarios)
            .slice(0, 12),
        );
    } catch {
      /* Local history is optional; storage restrictions do not break investigation. */
    }
    fetch("/api/session")
      .then((r) => r.json())
      .then((v) => {
        setAuth(v.authenticated);
        setLiveEnabled(v.liveEnabled);
        if (v.authenticated && v.liveEnabled) setMode("live");
      })
      .catch(() => {});
    return () => {
      generation.current++;
    };
  }, []);

  async function poll(run: SavedRun, ticket: number) {
    let errors = 0;
    for (let i = 0; i < 90 && ticket === generation.current; i++) {
      try {
        const response = await fetch(`/api/investigations/${run.runId}`, {
          headers: { "x-run-token": run.runToken },
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        const body = await response.json();
        if (ticket !== generation.current) return;
        if (!response.ok) {
          if (response.status === 404 || response.status === 403) {
            setError(body.error);
            setBusy(false);
            return;
          }
          throw new Error(body.error);
        }
        errors = 0;
        if (body.status === "completed") {
          setResult(body.result);
          setBusy(false);
          setStatus("Investigation complete");
          return;
        }
        if (body.status === "failed" || body.status === "cancelled") {
          setError(
            "The investigation could not complete. Evidence retrieval or model generation failed; no diagnosis has been substituted. Check the workflow trace, or start a new run.",
          );
          setBusy(false);
          return;
        }
        setStatus(
          body.status === "pending"
            ? "Investigation queued"
            : "Retrieving evidence and preparing the report",
        );
      } catch {
        if (ticket !== generation.current) return;
        errors++;
        setStatus("Connection interrupted. Reconnecting to your saved run…");
        if (errors >= 4) {
          setError(
            "Could not reconnect. Your run may still be processing. Open Saved investigations to reconnect later.",
          );
          setBusy(false);
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (ticket === generation.current) {
      setBusy(false);
      setError(
        "This run is taking longer than expected. It remains in Saved investigations; reconnect there to check its progress.",
      );
    }
  }

  async function startRun() {
    setBusy(true);
    setResult(null);
    setError("");
    setStatus("Starting a durable investigation…");
    const ticket = ++generation.current;
    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, mode, fault }),
        signal: AbortSignal.timeout(25000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      const run: SavedRun = {
        ...body,
        scenario,
        mode,
        date: new Date().toISOString(),
      };
      setHistory((previous) => {
        const next = [run, ...previous].slice(0, 12);
        try {
          localStorage.setItem(historyKey, JSON.stringify(next));
        } catch {
          /* run remains usable */
        }
        return next;
      });
      if (ticket !== generation.current) return;
      setActiveRun(run);
      void poll(run, ticket);
    } catch (e) {
      if (ticket === generation.current) {
        setError(
          e instanceof Error ? e.message : "Could not start investigation",
        );
        setBusy(false);
      }
    }
  }

  function resume(run: SavedRun) {
    setScenario(run.scenario);
    setMode(run.mode);
    setActiveRun(run);
    setResult(null);
    setError("");
    setBusy(true);
    setShowHistory(false);
    void poll(run, ++generation.current);
  }
  function changeScenario(value: ScenarioId) {
    generation.current++;
    setScenario(value);
    setResult(null);
    setActiveRun(null);
    setError("");
    setBusy(false);
    setStatus("");
  }
  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setAuth(true);
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlock live AI");
    }
  }
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relay-${scenario}-investigation.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function cite(id: string) {
    setTab("evidence");
    requestAnimationFrame(() =>
      document
        .getElementById(`evidence-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to investigation
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand-link" aria-label="Relay home">
          <Logo />
        </Link>
        <div className="workspace-switch">
          <span className="workspace-icon">N</span>
          <div>
            <strong>Northstar Commerce</strong>
            <span>Demo workspace</span>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Primary">
          <Link className="nav-item selected" href="/">
            <Icon name="pulse" />
            Incident workbench
          </Link>
          <button className="nav-item" onClick={() => setShowHistory(true)}>
            <Icon name="clock" />
            Saved investigations
            <span className="nav-count">{history.length}</span>
          </button>
          <Link className="nav-item" href="/proposal">
            <Icon name="layers" />
            Solution brief
            <Icon name="arrow" size={14} />
          </Link>
        </nav>
        <div className="sidebar-note">
          <span className="tiny-dot" /> EVIDENCE FIRST
          <p>
            Keep your telemetry.
            <br />
            Find your next step.
          </p>
          <Link href="/proposal#architecture">
            See the architecture <span>↗</span>
          </Link>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">EA</span>
          <div>
            <strong>Enterprise analyst</strong>
            <span>{auth ? "Reviewer access active" : "Read-only demo"}</span>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Incident workbench</strong>
          </div>
          <div className="topbar-right">
            <span className="synthetic-badge">Synthetic data</span>
            <Link href="/proposal">
              Customer proposal <Icon name="arrow" size={15} />
            </Link>
          </div>
        </header>
        <main id="main-content" className="workbench">
          <div className="page-heading">
            <div>
              <div className="eyebrow">THE SIGNAL IS JUST THE START</div>
              <h1>Make the next step clear.</h1>
              <p>
                Investigate the incident. Follow the evidence. Keep your team
                moving.
              </p>
            </div>
            <div className="environment">
              <span className="tiny-dot" /> Northstar · AWS estate
              <span>Illustrative customer scenario</span>
            </div>
          </div>
          <div className="incident-selector">
            <div className="selector-icon">
              <Icon name="pulse" size={21} />
            </div>
            <div className="selector-field">
              <label htmlFor="scenario">Investigate a customer journey</label>
              <select
                id="scenario"
                value={scenario}
                onChange={(e) => changeScenario(e.target.value as ScenarioId)}
              >
                {Object.entries(scenarios).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.code} · {s.short}
                  </option>
                ))}
              </select>
            </div>
            <span className="badge amber">
              <span /> {active.severity}
            </span>
            <div className="selector-time">
              <Icon name="clock" size={15} /> 30-minute incident window
            </div>
          </div>
          <div className="incident-heading">
            <div>
              <h2>{active.title}</h2>
              <p>{active.subtitle}</p>
            </div>
            <span className="mono">{active.code}</span>
          </div>
          <div className="metrics-row">
            <div className="metric">
              <span>
                Checkout latency <small>p95</small>
              </span>
              <div>
                {active.latency}
                <em>ms</em>
                <b>{active.change}</b>
              </div>
              <p>Baseline {active.baseline} ms</p>
            </div>
            <div className="metric">
              <span>API error rate</span>
              <div>
                {active.error}
                <em>%</em>
                <span className="metric-status">Above baseline</span>
              </div>
              <p>Not a measure of lost orders</p>
            </div>
            <div className="metric">
              <span>Evidence available</span>
              <div>
                {bundle.evidence.length}
                <em>sources</em>
                <span className="evidence-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <p>Metrics, traces & change events</p>
            </div>
          </div>
          <div className="investigation-grid">
            <section className="evidence-column" aria-label="Incident evidence">
              <div
                className="tab-bar"
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    const next = tab === "overview" ? "evidence" : "overview";
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
                role="tablist"
                aria-label="Evidence view"
              >
                <button
                  role="tab"
                  id="tab-overview"
                  aria-controls="evidence-panel"
                  aria-selected={tab === "overview"}
                  className={tab === "overview" ? "active" : ""}
                  onClick={() => setTab("overview")}
                >
                  Overview
                </button>
                <button
                  role="tab"
                  id="tab-evidence"
                  aria-controls="evidence-panel"
                  aria-selected={tab === "evidence"}
                  className={tab === "evidence" ? "active" : ""}
                  onClick={() => setTab("evidence")}
                >
                  Evidence register <span>{bundle.evidence.length}</span>
                </button>
                <span className="tab-note">Fixed synthetic snapshot</span>
              </div>
              <div
                id="evidence-panel"
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
              >
                {tab === "overview" ? (
                  <>
                    <div className="panel chart-panel">
                      <div className="panel-heading">
                        <h3>Checkout response time</h3>
                        <span>
                          <i className="legend-dot" /> p95 latency
                        </span>
                      </div>
                      <Chart scenario={scenario} />
                      <div className="chart-foot">
                        <Icon name="info" size={14} /> A change near an alert is
                        a lead, not proof of a cause.
                      </div>
                    </div>
                    <div className="panel trace-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Follow the slow request</h3>
                          <p>
                            Representative trace · illustrative span timings
                          </p>
                        </div>
                        <span className="mini-label">
                          {active.spans.length} SPANS
                        </span>
                      </div>
                      <div className="span-scale">
                        <span>Service / operation</span>
                        <span>0</span>
                        <span>3.5 s</span>
                      </div>
                      {active.spans.map((span, i) => (
                        <div className="span-row" key={span.name}>
                          <div
                            className="span-name"
                            style={{ paddingLeft: `${Math.min(i, 2) * 9}px` }}
                          >
                            <span className={`service-dot ${span.color}`} />
                            <div>
                              <strong>{span.name}</strong>
                              <small>{span.service}</small>
                            </div>
                          </div>
                          <div className="span-track">
                            <div
                              className={`span-block ${span.color}`}
                              style={{
                                marginLeft: `${(span.start / 3500) * 100}%`,
                                width: `${Math.max(1, (span.duration / 3500) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="span-duration">
                            {span.duration.toLocaleString()} ms
                          </span>
                        </div>
                      ))}
                      <button
                        className="text-button"
                        onClick={() => setTab("evidence")}
                      >
                        Inspect source evidence <Icon name="arrow" size={15} />
                      </button>
                    </div>
                    <div className="boundary-strip">
                      <div className="boundary-icon">
                        <Icon name="lock" />
                      </div>
                      <div>
                        <strong>Your systems stay your systems.</strong>
                        <p>
                          Read-only telemetry crosses the API boundary. No
                          remediation tools are exposed.
                        </p>
                      </div>
                      <Link
                        href="/proposal#architecture"
                        aria-label="Explore the architecture"
                      >
                        <Icon name="arrow" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="evidence-list">
                    {bundle.evidence.map((item) => (
                      <article
                        id={`evidence-${item.id}`}
                        className="panel evidence-card"
                        key={item.id}
                      >
                        <div className="evidence-card-top">
                          <span className="citation-id">{item.id}</span>
                          <span className="mini-label">{item.kind}</span>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                        <footer>
                          <Icon name="layers" size={14} />
                          {item.source}
                        </footer>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <aside
              className="analysis-column"
              aria-label="Investigation assistant"
            >
              <div className="assistant-panel">
                <div className="assistant-heading">
                  <span className="assistant-icon">
                    <Icon name="spark" size={19} />
                  </span>
                  <div>
                    <h3>From signals to a next step</h3>
                    <p>Evidence-backed investigation</p>
                  </div>
                </div>
                {!result && (
                  <>
                    <div className="prompt-card">
                      <span className="mini-label">INVESTIGATION QUESTION</span>
                      <p>{active.question}</p>
                    </div>
                    <div className="mode-control">
                      <label htmlFor="mode">Analysis mode</label>
                      <select
                        id="mode"
                        value={mode}
                        disabled={busy}
                        onChange={(e) =>
                          setMode(e.target.value as "sample" | "live")
                        }
                      >
                        <option value="sample">
                          Authored sample · no model call
                        </option>
                        <option value="live">
                          Live AI · Vercel AI Gateway
                        </option>
                      </select>
                    </div>
                    {mode === "live" && !liveEnabled && (
                      <p className="inline-note">
                        Live AI is not enabled in this environment. Sample mode
                        is available for rehearsal.
                      </p>
                    )}
                    {mode === "live" && !auth && liveEnabled && (
                      <form className="unlock-form" onSubmit={unlock}>
                        <label htmlFor="access-code">
                          Reviewer access code
                        </label>
                        <div>
                          <input
                            id="access-code"
                            type="password"
                            autoComplete="current-password"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            placeholder="Provided with your demo link"
                          />
                          <button type="submit" aria-label="Unlock live AI">
                            <Icon name="arrow" />
                          </button>
                        </div>
                        <small>
                          Protects the demo’s model allowance. Access lasts one
                          hour.
                        </small>
                      </form>
                    )}
                    <button
                      className="primary-button run-button"
                      disabled={
                        busy || (mode === "live" && (!auth || !liveEnabled))
                      }
                      onClick={startRun}
                    >
                      {busy ? (
                        <span className="spinner" />
                      ) : (
                        <Icon name="spark" size={16} />
                      )}{" "}
                      {busy ? "Investigating…" : "Run investigation"}
                      {!busy && <Icon name="arrow" size={17} />}
                    </button>
                    <p className="run-note">
                      {mode === "sample"
                        ? "Uses a labeled, authored report after fetching the external mock API."
                        : "Generates a new report from the retrieved evidence. No operational changes."}
                    </p>
                  </>
                )}
                {busy && (
                  <div className="run-progress" role="status">
                    <span className="live-pulse" />
                    <strong>{status}</strong>
                    <p>
                      You can refresh or leave this page. Reconnect from Saved
                      investigations.
                    </p>
                  </div>
                )}
                {error && (
                  <div className="error-box" role="alert">
                    <strong>Investigation needs attention</strong>
                    <p>{error}</p>
                  </div>
                )}
                {result && (
                  <div className="report" aria-live="polite">
                    <div className="report-badges">
                      <span
                        className={`badge ${result.mode === "live" ? "violet" : "neutral"}`}
                      >
                        {result.mode === "live"
                          ? "Live AI · review required"
                          : "Authored sample"}
                      </span>
                      <button
                        className="icon-button"
                        onClick={download}
                        aria-label="Download investigation JSON"
                      >
                        <Icon name="download" size={17} />
                      </button>
                    </div>
                    <span className="assessment-label">
                      {result.report.assessment === "insufficient-evidence"
                        ? "INSUFFICIENT EVIDENCE"
                        : "SUPPORTED HYPOTHESIS · NOT CONFIRMED"}
                    </span>
                    <h3>{result.report.title}</h3>
                    <p className="report-summary">{result.report.summary}</p>
                    <h4>What the evidence says</h4>
                    {result.report.findings.map((finding, i) => (
                      <div className="finding" key={i}>
                        <span className="finding-number">0{i + 1}</span>
                        <div>
                          <p>{finding.text}</p>
                          <div className="citations">
                            {finding.citations.map((id) => (
                              <button
                                key={id}
                                onClick={() => cite(id)}
                                aria-label={`View evidence ${id}`}
                              >
                                {id} ↗
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="uncertainty">
                      <Icon name="info" size={16} />
                      <p>{result.report.uncertainty}</p>
                    </div>
                    <h4>Recommended next steps</h4>
                    {result.mode === "live" && (
                      <p className="review-note">
                        Check the cited evidence before sharing this draft.
                        Operational changes require the service owner’s
                        approval.
                      </p>
                    )}
                    <ol className="next-steps">
                      {result.report.nextSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <div className="customer-update">
                      <div>
                        <span className="mini-label">CUSTOMER UPDATE</span>
                        <button
                          className="icon-button"
                          aria-label="Copy customer update"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                result.report.customerUpdate,
                              );
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            } catch {
                              setError(
                                "Clipboard unavailable. Select and copy the customer update directly.",
                              );
                            }
                          }}
                        >
                          <Icon name={copied ? "check" : "copy"} size={15} />
                        </button>
                      </div>
                      <p>{result.report.customerUpdate}</p>
                    </div>
                    <details className="run-details">
                      <summary>Run details & accounting</summary>
                      <dl>
                        <dt>Mode</dt>
                        <dd>
                          {result.mode === "live"
                            ? "Live model generation"
                            : "Authored; no AI inference"}
                        </dd>
                        <dt>Retrieval</dt>
                        <dd>
                          {result.telemetry.retrievalMs} ms ·{" "}
                          {result.telemetry.retrievalAttempts} attempt(s)
                        </dd>
                        <dt>Model</dt>
                        <dd>{result.telemetry.model ?? "Not called"}</dd>
                        <dt>Model time</dt>
                        <dd>{result.telemetry.modelMs} ms</dd>
                        <dt>Tokens in / out</dt>
                        <dd>
                          {result.telemetry.inputTokens ?? "—"} /{" "}
                          {result.telemetry.outputTokens ?? "—"}
                        </dd>
                        <dt>Inference cost</dt>
                        <dd>
                          {result.telemetry.costUsd !== null
                            ? `$${result.telemetry.costUsd}`
                            : result.mode === "sample"
                              ? "$0 · no model call"
                              : "Not returned; check Gateway"}
                        </dd>
                        <dt>Run</dt>
                        <dd>{activeRun?.runId}</dd>
                      </dl>
                      <p>
                        Inference cost excludes Functions and Workflow usage.
                      </p>
                    </details>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setResult(null);
                        setActiveRun(null);
                        setError("");
                      }}
                    >
                      Start another investigation{" "}
                      <Icon name="arrow" size={15} />
                    </button>
                  </div>
                )}
                {!result && !busy && (
                  <div className="assistant-explainer">
                    <div>
                      <span>01</span>
                      <p>Retrieve a bounded set of telemetry evidence.</p>
                    </div>
                    <div>
                      <span>02</span>
                      <p>Separate observations from hypotheses.</p>
                    </div>
                    <div>
                      <span>03</span>
                      <p>
                        Propose the next check. Leave decisions with your team.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <details className="failure-controls">
                <summary>
                  Test resilience <Icon name="pulse" size={14} />
                </summary>
                <label htmlFor="fault">Telemetry API behavior</label>
                <select
                  id="fault"
                  value={fault}
                  disabled={busy}
                  onChange={(e) =>
                    setFault(e.target.value as InvestigationInput["fault"])
                  }
                >
                  <option value="none">Healthy response</option>
                  <option value="transient">First request returns 503</option>
                  <option value="outage">Persistent 503 outage</option>
                </select>
                <p>
                  Transient failure should recover. Persistent failure should
                  produce no diagnosis.
                </p>
              </details>
            </aside>
          </div>
          <footer className="workbench-footer">
            <span>RELAY / A VERCEL SOLUTION EXPLORATION</span>
            <span>
              Fictional customer · Synthetic telemetry · Human decisions
            </span>
          </footer>
        </main>
      </div>
      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            className="history-dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowHistory(false);
            }}
          >
            <header>
              <div>
                <h2 id="history-title">Saved investigations</h2>
                <p>
                  Run references on this browser. Results are retained by the
                  workflow service.
                </p>
              </div>
              <button
                autoFocus
                className="icon-button"
                onClick={() => setShowHistory(false)}
                aria-label="Close saved investigations"
              >
                <Icon name="close" />
              </button>
            </header>
            {history.length === 0 ? (
              <div className="history-empty">
                <Icon name="clock" size={30} />
                <h3>Your first investigation starts here.</h3>
                <p>
                  Run an incident to save a reference and reconnect after a
                  refresh.
                </p>
              </div>
            ) : (
              history.map((run) => (
                <button
                  className="history-item"
                  key={run.runId}
                  onClick={() => resume(run)}
                >
                  <span className="history-item-icon">
                    <Icon name="pulse" />
                  </span>
                  <div>
                    <strong>{scenarios[run.scenario].short}</strong>
                    <span>
                      {new Date(run.date).toLocaleString()} ·{" "}
                      {run.mode === "live" ? "Live AI" : "Authored sample"}
                    </span>
                  </div>
                  <Icon name="arrow" />
                </button>
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
