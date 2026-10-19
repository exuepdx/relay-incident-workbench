"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { useDiagramMotion, usePresentationMotion } from "./presentation-motion";

function Choices({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="deck-choices" role="group" aria-label={label} data-deck-interactive>
      {options.map((option, index) => (
        <button key={option} aria-pressed={value === index} onClick={() => onChange(index)}>
          {option}
        </button>
      ))}
    </div>
  );
}

export function CascadeVisual({ durations }: { durations: number[] }) {
  const [focus, setFocus] = useState(0);
  const { ref, animated } = useDiagramMotion();
  const stages = [
    [
      "Customer impact",
      "Several teams join the outage call",
      "Checkout, inventory, database and network teams each have a different view.",
    ],
    [
      "Trace evidence",
      "Most of this trace is connection waiting",
      "The 2,450 ms connection wait occurs before the successful database query.",
    ],
    [
      "Next owner",
      "Network Platform + Inventory Services",
      "Correlate rejected flows with request timestamps before selecting a mitigation.",
    ],
  ];
  const nodes = [
    { name: "Checkout", icon: "layers", owner: "Checkout Experience", state: "Degraded" },
    { name: "Inventory", icon: "server", owner: "Inventory Services", state: "Degraded" },
    { name: "DB connection", icon: "network", owner: "Network Platform", state: "Investigate" },
    { name: "Database", icon: "database", owner: "Data Platform", state: "Query in baseline" },
  ];
  return (
    <div ref={ref} className="deck-diagram cascade-visual" data-motion={animated}>
      <Choices label="Explore the incident" options={stages.map((s) => s[0])} value={focus} onChange={setFocus} />
      <div
        className="cascade-path"
        aria-label="Checkout depends on inventory, which connects to the database across a network path"
      >
        {nodes.map((node, i) => (
          <div
            key={node.name}
            className={`cascade-station station-${i} ${focus > 0 && i === 2 ? "station-focus" : ""}`}
          >
            <div className="station-block">
              <div className="station-top">
                <Icon name={node.icon} size={29} />
                <span>0{i + 1}</span>
              </div>
              <strong>{node.name}</strong>
              <span className={`station-status ${i === 3 ? "baseline" : "affected"}`}>{node.state}</span>
            </div>
            <span className="station-owner">{node.owner}</span>
            {i < 3 && (
              <span className="station-wire" aria-hidden="true">
                <i />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="cascade-lower">
        <div className="deck-trace" aria-label="Representative synthetic trace timings">
          <span className="diagram-eyebrow">Representative trace · E2</span>
          {nodes.map((node, i) => (
            <div key={node.name} className={`deck-trace-row ${i === 2 ? "trace-emphasis" : ""}`}>
              <span>{i === 3 ? "Successful query" : node.name}</span>
              <div>
                <i style={{ width: `${(durations[i] / durations[0]) * 100}%` }} />
              </div>
              <b>{durations[i].toLocaleString("en-US")} ms</b>
            </div>
          ))}
        </div>
        <div className="diagram-insight" aria-live="polite">
          <span className="diagram-eyebrow">{stages[focus][0]}</span>
          <h3>{stages[focus][1]}</h3>
          <p>{stages[focus][2]}</p>
        </div>
      </div>
      <p className="diagram-caption">
        Synthetic incident. Arrows show dependencies; the physical cause is unconfirmed.
      </p>
    </div>
  );
}

const layers = [
  {
    name: "Next.js",
    job: "View + cache",
    icon: "layers",
    detail: "Static shell, cached incident context, live run status.",
    tradeoff: "Cached context needs explicit refresh.",
  },
  {
    name: "Workflows",
    job: "Retry + wait",
    icon: "clock",
    detail: "Tool steps and approval waits preserve investigation progress.",
    tradeoff: "Execution retention differs from report retention.",
  },
  {
    name: "AI SDK",
    job: "Tools + report",
    icon: "tool",
    detail: "Three bounded read tools produce a report with citations.",
    tradeoff: "Valid citations still require judgment about the claim.",
  },
  {
    name: "AI Gateway",
    job: "Models + cost",
    icon: "spark",
    detail: "One model interface with routing and per-run accounting.",
    tradeoff: "Fallback stays off until the candidate passes quality checks.",
  },
];

export function ArchitectureVisual() {
  const [pilot, setPilot] = useState(0);
  const [selected, setSelected] = useState(1);
  const { ref, animated } = useDiagramMotion();
  return (
    <div ref={ref} className="deck-diagram architecture-visual" data-motion={animated}>
      <Choices
        label="Architecture scope"
        options={["Hosted demo", "Proposed customer pilot"]}
        value={pilot}
        onChange={setPilot}
      />
      <div className="architecture-layout">
        <div className="architecture-estate">
          <span className="diagram-eyebrow">{pilot ? "Customer cloud" : "Separate Vercel project"}</span>
          <h3>{pilot ? "Existing systems" : "Synthetic telemetry"}</h3>
          <div className="estate-stack" aria-hidden="true">
            <div />
            <div />
            <div>
              <Icon name="server" size={35} />
            </div>
          </div>
          <div className="estate-labels">
            {(pilot
              ? ["EKS services", "RDS Postgres", "Jenkins + observability"]
              : ["Metrics", "Traces", "Recent changes"]
            ).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="api-port">
            <Icon name="lock" size={15} /> Read-only API
          </div>
          <small>
            {pilot
              ? "Services, transaction data and alerting stay here."
              : "A real deployment serving canned incident data."}
          </small>
        </div>
        <div className="architecture-bridge" aria-hidden="true">
          <span>HTTPS</span>
          <div>
            <i />
          </div>
          <span>Scoped token</span>
        </div>
        <div className="architecture-relay">
          <span className="diagram-eyebrow">Vercel · Relay application</span>
          <div
            className="layer-stack"
            role="group"
            aria-label="Explore the four Vercel primitives"
            data-deck-interactive
          >
            {layers.map((layer, index) => (
              <button
                key={layer.name}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
                className={`architecture-layer ${selected === index ? "layer-selected" : ""}`}
              >
                <Icon name={layer.icon} size={22} />
                <strong>{layer.name}</strong>
                <span>{layer.job}</span>
                <b aria-hidden="true">0{index + 1}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="architecture-external">
          <span className="diagram-eyebrow">External services</span>
          <div className="external-service">
            <Icon name="spark" size={24} />
            <h3>Model provider</h3>
            <span>Evidence + inference</span>
            <small>via AI Gateway</small>
          </div>
          <div className="external-service">
            <Icon name="database" size={24} />
            <h3>{pilot ? "Customer Postgres" : "Neon Postgres"}</h3>
            <span>Reports + approvals</span>
            <small>via Workflow steps</small>
          </div>
        </div>
      </div>
      <div className="architecture-detail" aria-live="polite">
        <strong>{layers[selected].name}</strong>
        <span>{layers[selected].detail}</span>
        <small>Trade-off: {layers[selected].tradeoff}</small>
      </div>
      <p className="diagram-caption">
        Selected evidence crosses into Vercel and the model provider. Workflow state remains on Vercel.
      </p>
    </div>
  );
}

const flowSteps = ["Read", "Draft", "Validate", "Review", "Save"];
const flowCopy = [
  ["Three read-only tools", "Retrieve metrics, traces and recent changes from the telemetry API."],
  ["Generate the report", "The model proposes findings, uncertainty and the next checks."],
  ["Check the retrieved evidence", "Validate citation IDs, owners and incident-specific policy before review."],
  [
    "Optional reviewer decision",
    "A mitigation proposal pauses here. Approval records a decision; it executes no change.",
  ],
  ["Reopen the same investigation", "The report and its evidence snapshot persist in Postgres."],
];

export function InvestigationVisual() {
  const [scenario, setScenario] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { ref, animated } = useDiagramMotion();
  const { motion } = usePresentationMotion();
  useEffect(() => {
    if (!motion) {
      setPlaying(false);
      return;
    }
    if (!playing || !animated) return;
    if (step === 4) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 1900);
    return () => clearTimeout(timer);
  }, [playing, animated, step, motion]);
  const select = (value: number) => {
    setScenario(value);
    setStep(0);
    setPlaying(false);
  };
  const copy =
    scenario === 1 && step === 0
      ? [
          "503 → retry the read",
          "A temporary telemetry failure retries the step. Refreshing the browser reconnects to the same run.",
        ]
      : scenario === 2 && step >= 2
        ? step === 4
          ? [
              "Save an incomplete-evidence report",
              "Retain the coverage gaps and collection requests for the next responder.",
            ]
          : [
              "Withhold the diagnosis",
              "Missing downstream evidence produces collection requests. No mitigation approval is offered.",
            ]
        : flowCopy[step];
  return (
    <div ref={ref} className="deck-diagram investigation-visual" data-motion={animated}>
      <div className="diagram-toolbar">
        <Choices
          label="Illustrated investigation scenario"
          options={["With review", "Transient failure", "Missing evidence"]}
          value={scenario}
          onChange={select}
        />
        <button
          className="deck-play"
          disabled={!motion}
          onClick={() => {
            if (step === 4) setStep(0);
            setPlaying((value) => !value);
          }}
          aria-pressed={playing}
        >
          {playing ? "Ⅱ Pause" : "▷ Play sequence"}
        </button>
      </div>
      <div className="flow-rail" role="group" aria-label="Investigation stages" data-deck-interactive>
        {flowSteps.map((label, index) => (
          <button
            key={label}
            className={`${index === step ? "flow-current" : ""} ${index < step ? "flow-complete" : ""}`}
            aria-pressed={index === step}
            onClick={() => {
              setStep(index);
              setPlaying(false);
            }}
          >
            <span className="flow-symbol">
              <Icon name={["layers", "spark", "shield", "check", "database"][index]} size={25} />
            </span>
            <span>{scenario === 2 && index === 3 ? "No mitigation" : label}</span>
            <small>0{index + 1}</small>
          </button>
        ))}
      </div>
      <div className="flow-stage">
        <div className={`evidence-machine step-${step}`} aria-hidden="true">
          <div className="machine-orbit" />
          <div className="machine-orbit second" />
          <div className={`evidence-sheet sheet-back ${step > 0 ? "sheet-collected" : ""}`}>
            <span>E1</span>
            <i />
            <i />
          </div>
          <div className={`evidence-sheet sheet-mid ${step > 0 ? "sheet-collected" : ""}`}>
            <span>E2</span>
            <i />
            <i />
          </div>
          <div className={`evidence-sheet sheet-front ${step > 0 ? "sheet-collected" : ""}`}>
            <span>{step < 2 ? "E3" : scenario === 2 ? "GAPS" : "REPORT"}</span>
            <i />
            <i />
            <i />
            <b>{step >= 2 ? (scenario === 2 ? "?" : "✓") : "↗"}</b>
          </div>
          <span className="machine-label">
            {step < 2
              ? "Retrieved evidence"
              : step === 2
                ? "Validation checks"
                : step === 3
                  ? "Reviewed draft"
                  : "Saved snapshot"}
          </span>
        </div>
        <div className="flow-narration" aria-live="polite">
          <span className="diagram-eyebrow">Step {step + 1} / 5</span>
          <h3>{copy[0]}</h3>
          <p>{copy[1]}</p>
          <div className="flow-tags">
            {(step === 0
              ? scenario === 1
                ? ["API 503", "Step retry", "Same run"]
                : ["Metrics", "Traces", "Changes"]
              : step === 2
                ? ["Citations", "Owners", "Policy"]
                : step === 3
                  ? [scenario === 2 ? "Collect more evidence" : "Durable wait", "No execution"]
                  : step === 4
                    ? ["Report", "Evidence", "Cost"]
                    : ["AI SDK", "AI Gateway"]
            ).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="flow-step-controls">
            <button
              disabled={step === 0}
              onClick={() => {
                setStep((s) => s - 1);
                setPlaying(false);
              }}
            >
              ← Previous step
            </button>
            <button
              disabled={step === 4}
              onClick={() => {
                setStep((s) => s + 1);
                setPlaying(false);
              }}
            >
              Next step →
            </button>
          </div>
        </div>
      </div>
      <p className="diagram-caption">
        Illustrated workflow · no model calls. Use the live workbench to run the actual investigation.
      </p>
    </div>
  );
}

export function PilotVisual({ cases, passed }: { cases: number; passed: number }) {
  const { ref, animated } = useDiagramMotion();
  return (
    <div ref={ref} className="deck-diagram pilot-visual" data-motion={animated}>
      <div className="pilot-targets">
        <div className="pilot-card">
          <span className="diagram-eyebrow">Coordination target</span>
          <div className="pilot-number">
            −20<span>%</span>
          </div>
          <h3>Responder-minutes</h3>
          <div className="comparison-bars" aria-label="Proposed baseline index 100, target 80">
            <div>
              <span>Baseline</span>
              <i />
              <b>100</b>
            </div>
            <div>
              <span>Target</span>
              <i />
              <b>80</b>
            </div>
          </div>
          <p>Time × participants to agree the next check.</p>
        </div>
        <div className="pilot-card">
          <span className="diagram-eyebrow">Quality target</span>
          <div className="quality-dial" aria-label="Review twenty pilot reports">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="48" pathLength="100" />
            </svg>
            <span>
              <b>20</b>reports
            </span>
          </div>
          <h3>0 unsupported critical claims</h3>
          <p>Human review, including incomplete cases.</p>
        </div>
        <div className="pilot-card">
          <span className="diagram-eyebrow">Performance targets</span>
          <div className="performance-target">
            <Icon name="clock" size={21} />
            <strong>
              &lt;30<span>s</span>
            </strong>
            <small>analysis p95</small>
          </div>
          <div className="performance-target">
            <Icon name="spark" size={21} />
            <strong>&lt;$0.05</strong>
            <small>model cost / run</small>
          </div>
          <p>Track approval waits and platform costs separately.</p>
        </div>
      </div>
      <div className="verification-strip">
        <span>
          <Icon name="check" size={16} /> Recorded checks
        </span>
        <a href="https://github.com/exuepdx/relay-incident-workbench/actions/workflows/ci.yml">
          <b>36</b> regression tests
        </a>
        <a href="https://github.com/exuepdx/relay-incident-workbench/blob/main/artifacts/evaluation.json">
          <b>{cases ? `${passed}/${cases}` : "—"}</b> primary model cases
        </a>
        <a href="https://github.com/exuepdx/relay-incident-workbench/blob/main/artifacts/deployment-smoke.json">
          <b>7</b> hosted scenarios
        </a>
      </div>
      <p className="diagram-caption">
        Proposed pilot targets, not measured customer improvements. Test results cover the synthetic demo.
      </p>
    </div>
  );
}

const rollout = [
  ["Preview", "Test a separate deployment", "Synthetic inputs, isolated credentials and a preview URL."],
  ["Validate", "Review quality before inviting users", "Check reports, identity, data boundaries and spend limits."],
  ["Canary", "Invite one on-call rotation", "A limited cohort uses B while the existing process stays available."],
  ["Cutover", "Send new requests to B", "Expand after the agreed quality and cost targets hold."],
  [
    "Rollback",
    "Restore A for new requests",
    "Existing workflows keep their starting deployment. Reconcile pending reviews.",
  ],
];

export function RolloutVisual() {
  const [step, setStep] = useState(0);
  const { ref, animated } = useDiagramMotion();
  const bLive = step === 3;
  const canary = step === 2;
  return (
    <div ref={ref} className="deck-diagram rollout-visual" data-motion={animated}>
      <Choices label="Proposed rollout stages" options={rollout.map((s) => s[0])} value={step} onChange={setStep} />
      <div className="deployment-stage">
        <div className="deployment-users">
          <Icon name="globe" size={32} />
          <strong>{canary ? "Pilot cohort" : "New requests"}</strong>
          <span>{canary ? "One rotation" : bLive ? "Use deployment B" : "Use deployment A"}</span>
        </div>
        <svg className="deployment-wires" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
          <path d="M180 140 H300 V62 H480" className={!bLive ? "wire-on" : ""} />
          <path d="M180 140 H300 V218 H480" className={bLive || canary ? "wire-on" : ""} />
          <path d="M590 62 H730 V140 H850" className="wire-state" />
          <path d="M590 218 H730 V140 H850" className="wire-state" />
        </svg>
        <div className="deployment-builds">
          <div className={`build-block ${!bLive ? "build-live" : ""}`}>
            <span className="build-letter">A</span>
            <div>
              <strong>Original deployment</strong>
              <small>{!bLive ? "Serving requests" : "Existing run continues"}</small>
            </div>
            <i />
          </div>
          <div className={`build-block ${bLive || canary ? "build-live" : ""}`}>
            <span className="build-letter">B</span>
            <div>
              <strong>New deployment</strong>
              <small>
                {canary
                  ? "Pilot access"
                  : bLive
                    ? "Serving new requests"
                    : step === 4
                      ? "Removed from traffic"
                      : "Preview + checks"}
              </small>
            </div>
            <i />
          </div>
        </div>
        <div className="deployment-store">
          <Icon name="database" size={34} />
          <strong>Saved reports</strong>
          <span>Postgres</span>
          <small>Same evidence snapshot</small>
        </div>
      </div>
      <div className="rollout-insight" aria-live="polite">
        <span className="diagram-eyebrow">
          0{step + 1} / {rollout[step][0]}
        </span>
        <h3>{rollout[step][1]}</h3>
        <p>{rollout[step][2]}</p>
      </div>
      <p className="diagram-caption">
        Proposed rollout. Promotion and rollback were rehearsed; cohort access here is illustrative.
      </p>
    </div>
  );
}
