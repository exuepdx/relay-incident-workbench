"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { useDiagramMotion, usePresentationMotion } from "./presentation-motion";

// These sequences explain implemented guards. They never start a run or call a model.
const decisions = [
  {
    tab: "Duplicate starts",
    title: "A lost response must not start a second paid run.",
    input: ["Start request", "Retry · same key"],
    inputIcon: "refresh",
    guard: "Reserve before dispatch",
    guardDetail: "Postgres · unique request key",
    guardIcon: "database",
    output: "One investigation",
    outputDetail: "Both requests resolve to the same run",
    outputIcon: "pulse",
    alternative: "Blindly retry the start",
    consequence: "A second investigation can add cost and conflicting reports.",
    cost: "An ambiguous start waits for recovery instead of silently dispatching again.",
    proof: "Hosted replay + duplicate-start checks",
    href: "artifacts/postgres-verification.json",
    beats: [
      "The response is lost; the client retries with the same key.",
      "A unique reservation is claimed before the workflow starts.",
      "Reconnect to the bound run. Pending reservations are not dispatched again.",
    ],
  },
  {
    tab: "Evidence before approval",
    title: "Check the evidence before offering approval.",
    input: ["Model draft + citations", "Retrieved evidence snapshot"],
    inputIcon: "layers",
    guard: "Validate before review",
    guardDetail: "Required reads · citations · owners · policy",
    guardIcon: "shield",
    output: "Withhold diagnosis",
    outputDetail: "Incomplete evidence → collect measurements",
    outputIcon: "info",
    alternative: "Send every model draft to approval",
    consequence: "A reviewer could approve an unsupported recommendation.",
    cost: "Some runs cannot recommend a mitigation. Valid IDs still do not prove every written claim.",
    proof: "Missing-evidence + approval regressions",
    href: "tests/safety.test.ts",
    beats: [
      "This example has incomplete downstream evidence.",
      "Checks use the actual tool results before any approval can appear.",
      "Save the gaps and next measurements. No mitigation approval is offered.",
    ],
  },
  {
    tab: "Model fallback",
    title: "The fallback route worked. Its report failed.",
    input: ["Primary route unavailable", "Candidate route responds"],
    inputIcon: "network",
    guard: "Qualify report quality",
    guardDetail: "Routing passed · candidate quality failed",
    guardIcon: "shield",
    output: "No automatic fallback",
    outputDetail: "Surface failure; keep the unqualified route off",
    outputIcon: "lock",
    alternative: "Route to any available model",
    consequence: "Availability improves, but report quality can silently change.",
    cost: "Less outage coverage until another model passes the same report checks.",
    proof: "Retained candidate evaluation failure",
    href: "artifacts/evaluation-gemini-repair.json",
    beats: [
      "An alternate model can answer when the primary route cannot.",
      "The candidate passed routing, but failed a report-quality check.",
      "Automatic fallback is disabled. Explicit comparison remains available.",
    ],
  },
];

export function ArchitectureDecisions() {
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState(2);
  const [playing, setPlaying] = useState(false);
  const { ref, animated } = useDiagramMotion();
  const { motion } = usePresentationMotion();
  const decision = decisions[selected];

  useEffect(() => {
    if (!motion || step === 2) {
      setPlaying(false);
      return;
    }
    if (!playing || !animated) return;
    const timer = window.setTimeout(() => setStep((value) => value + 1), 1600);
    return () => clearTimeout(timer);
  }, [motion, animated, playing, step]);

  return (
    <div ref={ref} className="deck-diagram decisions-visual" data-motion={animated} data-step={step}>
      <div className="diagram-toolbar" data-deck-interactive>
        <div className="deck-choices" role="group" aria-label="Architecture decisions">
          {decisions.map((item, index) => (
            <button
              key={item.tab}
              aria-pressed={selected === index}
              onClick={() => {
                setSelected(index);
                setStep(2);
                setPlaying(false);
              }}
            >
              {item.tab}
            </button>
          ))}
        </div>
        <button
          className="deck-play"
          disabled={!motion}
          aria-pressed={playing}
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              setStep(0);
              setPlaying(true);
            }
          }}
        >
          {playing ? "Ⅱ Pause" : "▷ Replay example"}
        </button>
      </div>

      <h3 className="decision-title">{decision.title}</h3>
      <div className="decision-flow" aria-label={decision.title}>
        <div className="decision-input decision-reached">
          <span className="diagram-eyebrow">01 / Trigger</span>
          {decision.input.map((label) => (
            <div key={label}>
              <Icon name={decision.inputIcon} size={18} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className={`decision-wire ${step >= 1 ? "decision-reached" : ""}`} aria-hidden="true">
          <i />
        </div>
        <div className={`decision-guard ${step >= 1 ? "decision-reached" : ""}`}>
          <span className="diagram-eyebrow">02 / {selected === 2 ? "Release decision" : "Decision"}</span>
          <div className="decision-chip">
            <Icon name={decision.guardIcon} size={34} />
          </div>
          <strong>{decision.guard}</strong>
          <small>{decision.guardDetail}</small>
        </div>
        <div className={`decision-wire ${step >= 2 ? "decision-reached" : ""}`} aria-hidden="true">
          <i />
        </div>
        <div className={`decision-output ${step >= 2 ? "decision-reached" : ""}`}>
          <span className="diagram-eyebrow">03 / Outcome</span>
          <Icon name={decision.outputIcon} size={28} />
          <strong>{decision.output}</strong>
          <small>{decision.outputDetail}</small>
        </div>
      </div>

      <div className="decision-beats" data-deck-interactive>
        <div role="group" aria-label="Walk through the decision">
          {["Trigger", "Decision", "Outcome"].map((label, index) => (
            <button
              key={label}
              aria-label={`Show ${label.toLowerCase()}`}
              aria-pressed={step === index}
              onClick={() => {
                setStep(index);
                setPlaying(false);
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <p aria-live="polite">{decision.beats[step]}</p>
      </div>

      <div className="decision-tradeoffs">
        <div>
          <span className="diagram-eyebrow">Alternative considered</span>
          <strong>{decision.alternative}</strong>
          <p>{decision.consequence}</p>
        </div>
        <div>
          <span className="diagram-eyebrow">Cost of our choice</span>
          <p>{decision.cost}</p>
        </div>
      </div>
      <div className="decision-proof">
        <span>Design illustration · no live calls</span>
        <a href={`https://github.com/exuepdx/relay-incident-workbench/blob/main/${decision.href}`}>
          {decision.proof} ↗
        </a>
      </div>
    </div>
  );
}
