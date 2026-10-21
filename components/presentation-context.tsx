"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { useDiagramMotion } from "./presentation-motion";

const repo = "https://github.com/exuepdx/relay-incident-workbench";

export function CurrentStateVisual() {
  return (
    <div className="current-state-visual">
      <div className="current-estate">
        <span className="diagram-eyebrow">Northstar · scenario stack</span>
        <div className="current-systems">
          {[
            ["server", "EKS", "Application services"],
            ["database", "RDS Postgres", "Transactions"],
            ["tool", "Jenkins", "Release pipeline"],
            ["pulse", "Observability", "Telemetry + alerts"],
          ].map(([icon, name, job]) => (
            <div key={name}>
              <Icon name={icon} size={24} />
              <strong>{name}</strong>
              <small>{job}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="current-connector" aria-hidden="true">
        <i />→
      </div>
      <div className="current-warroom">
        <div className="warroom-orbit" aria-hidden="true">
          <Icon name="network" size={40} />
        </div>
        <strong>Manual correlation</strong>
        <span>
          Separate dashboards
          <br />
          Shared outage call
        </span>
      </div>
      <div className="current-connector" aria-hidden="true">
        <i />→
      </div>
      <div className="current-responders">
        <span className="diagram-eyebrow">Four teams · different views</span>
        {["Checkout Experience", "Inventory Services", "Data Platform", "Network Platform"].map((name, i) => (
          <div key={name}>
            <span>0{i + 1}</span>
            {name}
          </div>
        ))}
      </div>
      <div className="current-impact">
        <span>
          <Icon name="clock" size={17} /> More responder time
        </span>
        <span>
          <Icon name="network" size={17} /> Slower agreement on the next owner
        </span>
        <span>
          <Icon name="globe" size={17} /> Checkout remains degraded
        </span>
      </div>
    </div>
  );
}

const risks = [
  {
    name: "Identity",
    icon: "lock",
    limitation: "Shared reviewer code",
    owner: "Identity + service owners",
    risk: "The demo cannot verify who owns a service.",
    action: "Agree SSO and scoped owner permissions before connecting real responders.",
  },
  {
    name: "Data boundary",
    icon: "database",
    limitation: "Evidence leaves the customer cloud",
    owner: "Security + platform",
    risk: "Evidence reaches Vercel and the model provider; Workflow state remains on Vercel.",
    action:
      "Approve redaction, retention, residency and the network path. A provider allow-list is not a region guarantee.",
  },
  {
    name: "Evidence quality",
    icon: "layers",
    limitation: "Synthetic inputs + curated topology",
    owner: "On-call + observability",
    risk: "Valid citations cannot prove every written conclusion. Missing evidence limits diagnosis.",
    action: "Validate connectors and topology against sanitized incidents; have responders review unsupported claims.",
  },
  {
    name: "Operational scope",
    icon: "shield",
    limitation: "Approval records a decision only",
    owner: "Service owners + platform",
    risk: "No remediation is executed. Retries add cost and automatic fallback is disabled.",
    action:
      "Set spend and retry budgets. Treat change execution as a separate integration with permissions, audit and rollback.",
  },
];

export function ReadinessVisual() {
  const [selected, setSelected] = useState(0);
  const { ref, animated } = useDiagramMotion();
  const risk = risks[selected];
  return (
    <div ref={ref} className="deck-diagram readiness-visual" data-motion={animated}>
      <div className="readiness-layout">
        <div className="readiness-cards" role="group" aria-label="Known limitations" data-deck-interactive>
          {risks.map((item, index) => (
            <button key={item.name} aria-pressed={selected === index} onClick={() => setSelected(index)}>
              <Icon name={item.icon} size={24} />
              <strong>{item.name}</strong>
              <span>{item.limitation}</span>
              <small>Discuss before pilot ↗</small>
            </button>
          ))}
        </div>
        <div className="readiness-detail" aria-live="polite">
          <span className="diagram-eyebrow">Kickoff decision / 0{selected + 1}</span>
          <h3>{risk.name}</h3>
          <p>{risk.risk}</p>
          <div>
            <span className="diagram-eyebrow">Before customer data</span>
            <p>{risk.action}</p>
          </div>
          <span className="readiness-owner">
            <Icon name="network" size={15} /> {risk.owner}
          </span>
        </div>
      </div>
      <div
        className="readiness-gate"
        aria-label="The working demo needs four kickoff decisions before a customer pilot"
      >
        <span>
          <Icon name="check" size={16} /> Working demo
        </span>
        <i aria-hidden="true" />
        <strong>
          <Icon name="lock" size={17} /> 4 kickoff decisions
        </strong>
        <i aria-hidden="true" />
        <span>Customer pilot</span>
      </div>
      <p className="diagram-caption">
        Proposed readiness gates, not completed production approvals. The demo uses synthetic data.
      </p>
    </div>
  );
}

const validation = [
  {
    name: "Regression checks",
    icon: "shield",
    title: "Reject invalid evidence and unsafe actions",
    tags: ["Citation IDs", "Owner IDs", "Required reads", "Duplicate starts"],
    result: "36 tests passed",
    href: "actions/workflows/ci.yml",
  },
  {
    name: "Live model cases",
    icon: "spark",
    title: "Check evidence, uncertainty and next actions",
    tags: ["Missing evidence", "Misleading change", "Injected log", "Overstated certainty"],
    result: "",
    href: "blob/main/artifacts/evaluation.json",
  },
  {
    name: "Hosted behavior",
    icon: "globe",
    title: "Exercise failures in the deployed workflow",
    tags: ["Retry", "Approve / decline", "Pause / resume", "Outage"],
    result: "7 expected outcomes passed",
    href: "blob/main/artifacts/deployment-smoke.json",
  },
];

export function BuildValidationVisual({
  passed,
  cases,
  candidateFailures,
}: {
  passed: number;
  cases: number;
  candidateFailures: number | null;
}) {
  const [selected, setSelected] = useState(1);
  const { ref, animated } = useDiagramMotion();
  const check = validation[selected];
  return (
    <div ref={ref} className="deck-diagram build-visual" data-motion={animated}>
      <div className="build-process">
        {[
          ["network", "Frame", "Customer problem + boundary"],
          ["tool", "Implement", "Codex desktop + Fable"],
          ["shield", "Challenge", "Regressions + live evaluations"],
          ["globe", "Release", "GitHub CI + Vercel CLI"],
        ].map(([icon, name, job], index) => (
          <div key={name}>
            <div className="build-process-icon">
              <Icon name={icon} size={27} />
              <span>0{index + 1}</span>
            </div>
            <strong>{name}</strong>
            <small>{job}</small>
            {index < 3 && <i aria-hidden="true" />}
          </div>
        ))}
      </div>
      <div className="tooling-credit">
        <span>
          <b>Codex desktop</b> · workspace, implementation, repairs
        </span>
        <span>
          <b>Fable</b> · rebuild and interface iteration
        </span>
      </div>
      <div className="build-checks">
        <div className="build-check-choices" role="group" aria-label="Validation evidence" data-deck-interactive>
          {validation.map((item, index) => (
            <button key={item.name} aria-pressed={selected === index} onClick={() => setSelected(index)}>
              <Icon name={item.icon} size={17} />
              {item.name}
            </button>
          ))}
        </div>
        <div className="build-check-detail" aria-live="polite">
          <h3>{check.title}</h3>
          <div className="validation-path">
            <span>Test inputs</span>
            <i aria-hidden="true">→</i>
            <span>Recorded output</span>
            <i aria-hidden="true">→</i>
            <strong>Explicit checks</strong>
          </div>
          <div className="flow-tags">
            {check.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <a href={`${repo}/${check.href}`}>
            {selected === 1
              ? cases
                ? `${passed}/${cases} primary cases passed`
                : "Live results unavailable"
              : check.result}{" "}
            ↗
          </a>
        </div>
      </div>
      <div className="build-finding">
        <Icon name="info" size={16} />
        <span>
          {candidateFailures === null
            ? "Candidate evaluation unavailable."
            : `${candidateFailures} candidate case${candidateFailures === 1 ? "" : "s"} failed → automatic fallback stays off.`}{" "}
          Automated checks still need review of the written claims.
        </span>
      </div>
      <p className="diagram-caption">
        Recorded results from synthetic incidents. AI-assisted implementation and its repair history are preserved in
        GitHub.
      </p>
    </div>
  );
}
