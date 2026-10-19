import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Suspense } from "react";
import { Icon, Logo } from "@/components/icons";
import { Hero } from "@/components/hero";
import { Reveal } from "@/components/motion";
import { BoundaryConduit } from "@/components/boundary-conduit";
import { Presenter } from "@/components/presenter";
import { customer } from "@/lib/customer";
import { config } from "@/lib/config";

// Static customer artifact. Main narrative is six screens; detail stays available below.
const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || "";
const repoUrl = process.env.NEXT_PUBLIC_REPO_URL || "";
type EvalArtifact = {
  mode?: string;
  evaluatedAt: string;
  model: string;
  cases: number;
  failures: number;
  results: Array<{
    name: string;
    error?: string;
    assessmentPassed?: boolean;
    regressionFailures?: string[];
    totalCostUsd?: string | null;
    report?: { assessment: string };
  }>;
};
function loadEval(file = "evaluation.json"): EvalArtifact | null {
  try {
    const result = JSON.parse(readFileSync(join(process.cwd(), "artifacts", file), "utf8"));
    return result.mode === "live" ? result : null;
  } catch {
    return null;
  }
}
const choices = [
  [
    "AI SDK + AI Gateway",
    "Bounded tools and structured reports; one model interface, explicit routing drills and per-run accounting.",
    "A valid citation does not prove a true claim. Evaluate each offered model; enforce evidence and approval rules in code.",
  ],
  [
    "Vercel Workflows",
    "Persist tool steps and approval waits so a browser disconnect does not lose the investigation.",
    "Run state has retention and deployment constraints. Keep the report in a durable index; retries can incur extra model charges.",
  ],
  [
    "Next.js on Vercel",
    "A static shell, cached incident context, and request-time run data. Preview deployments isolate changes before promotion.",
    "Cached context can age. Explicit refresh invalidates an incident; each report retains its own evidence snapshot.",
  ],
];
const rollout = [
  [
    "01",
    "Preview",
    "Use synthetic inputs, separate credentials and a preview URL. Run regression tests, live evaluations and the smoke suite.",
  ],
  [
    "02",
    "Validate",
    "Review evidence with responders. Agree data boundaries, identity, retention and spend limits before customer telemetry enters the pilot.",
  ],
  [
    "03",
    "Canary",
    "Invite one on-call rotation. Keep the existing incident process available. A percentage traffic rollout is optional where the plan supports it.",
  ],
  [
    "04",
    "Cutover",
    "Expand only after the quality and cost gates hold. Compare against the same rotation's baseline, not an invented benchmark.",
  ],
  [
    "05",
    "Rollback",
    "Restore the previous deployment or remove pilot access. Existing workflows stay pinned to their original deployment; reconcile any pending approvals.",
  ],
];
function Intro({ n, title, children }: { n: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="section-intro">
      <span className="section-n">{n}</span>
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
export default function Proposal() {
  const evaluation = loadEval();
  const candidate = loadEval("evaluation-gemini-repair.json");
  return (
    <main className="proposal">
      <Suspense fallback={null}>
        <Presenter />
      </Suspense>
      <Hero>
        <nav className="hero-nav" aria-label="Proposal">
          <Link href="/" aria-label="Relay home">
            <Logo />
          </Link>
          <nav>
            <a href="#architecture">Architecture</a>
            <a href="#demo">Demo</a>
            <a href="#measures">Value</a>
            <a href="#tooling">Validation</a>
            <Link href="/proposal?present=1" className="btn btn-ghost present-link">
              Present
            </Link>
            <Link href={`/incidents/${customer.leadIncident}`} className="btn btn-primary">
              Open workbench <Icon name="arrow" size={14} />
            </Link>
          </nav>
        </nav>
        <div className="hero-body">
          <div className="hero-copy">
            <span className="eyebrow">Relay · technical exercise · fictional retail scenario</span>
            <h1>
              Agree on the next check.
              <br />
              <em>Show the evidence.</em>
            </h1>
            <p>
              Connect existing telemetry to a response workspace that helps teams identify the affected dependency, name
              the next owner, and draft a source-backed update. People retain operational authority.
            </p>
            <div className="hero-cta">
              <Link href={`/incidents/${customer.leadIncident}`} className="btn btn-primary btn-lg">
                Investigate the cascade <Icon name="arrow" size={16} />
              </Link>
              <a href="#architecture" className="btn btn-lg">
                See the boundary
              </a>
            </div>
          </div>
        </div>
      </Hero>
      <div className="hero-meta">
        <div>
          Scenario <strong>{customer.name} · enterprise retail</strong>
        </div>
        <div>
          Vercel's role <strong>Connect telemetry; augment response</strong>
        </div>
        <div>
          Decision <strong>Next check and owner, with evidence</strong>
        </div>
      </div>

      <section className="section" id="problem" data-present="true">
        <Reveal>
          <Intro n="01 / CUSTOMER PROBLEM" title="The dashboards are available. Agreement takes time.">
            Based on an anonymized enterprise retail pattern: frequent outage bridges, fragmented tools, and several
            teams establishing whether their systems are involved.
          </Intro>
          <div className="cols-2">
            <div className="card">
              <h3>Current state</h3>
              <p>
                Checkout depends on application services, inventory, databases, external payments, and network paths.
                Each team sees a different slice. A downstream failure can look like several upstream failures.
              </p>
              <p className="muted">
                Representative demo stack: EKS, RDS Postgres, an observability platform and a Jenkins release pipeline.
                These are scenario assumptions, not asserted facts about the original customer.
              </p>
            </div>
            <div className="card">
              <h3>Business consequence</h3>
              <p>
                More responders spend time establishing ownership while customer-facing transactions remain degraded.
                Premature root-cause claims can send teams toward the wrong intervention.
              </p>
              <p>
                <strong>Discovery question:</strong> Where is the longest delay today: access to evidence, agreement on
                the affected path, or getting the right owner to act?
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section" id="architecture" data-present="true">
        <Reveal>
          <Intro n="02 / TARGET ARCHITECTURE" title="Keep the operational systems. Connect a response layer.">
            The boundary is an authenticated, read-only telemetry API. Selected evidence crosses into Vercel and the
            configured model; it does not all stay inside the customer's cloud.
          </Intro>
          <div className="arch">
            <div className="zone">
              <span className="eyebrow">Vercel · response application</span>
              <h3>Relay</h3>
              <div className="zone-node">
                <b>Next.js</b>
                <small>Static shell → cached incident catalog → live investigation status</small>
              </div>
              <div className="zone-node">
                <b>Workflows</b>
                <small>Read evidence → agent draft → validate → optional approval → persist</small>
              </div>
              <div className="zone-node">
                <b>AI SDK + AI Gateway → model provider</b>
                <small>
                  {config.model} · bounded tools and outputs · configured fallback:{" "}
                  {config.fallbackModels.join(", ") || "none"}
                </small>
              </div>
              <div className="zone-node">
                <b>Data on this side</b>
                <small>
                  Cached evidence, prompts, tool results, workflow state and operational metadata. Define retention and
                  redaction for each.
                </small>
              </div>
            </div>
            <BoundaryConduit />
            <div className="zone customer">
              <span className="eyebrow">Customer estate · retained authority</span>
              <h3>Existing systems</h3>
              <div className="zone-node">
                <b>Services, databases and network</b>
                <small>Keep tested business logic, transaction data and service ownership.</small>
              </div>
              <div className="zone-node">
                <b>Observability platform + scoped API</b>
                <small>
                  Keep telemetry ingestion, alerting and source retention. Return only the incident's bounded evidence.
                </small>
              </div>
              <div className="zone-node">
                <b>Durable investigation index</b>
                <small>
                  Postgres adapter can use a customer-controlled database. Hosted approval runs require this connection.
                </small>
              </div>
              <div className="zone-node">
                <b>Identity and change authority</b>
                <small>
                  A production pilot requires SSO and verified owner authorization. The demo uses a shared reviewer code
                  and executes no changes.
                </small>
              </div>
            </div>
          </div>
          <p className="note">
            Demo boundary: a separate synthetic telemetry service. Lambda and Vercel adapters are included; AWS and Neon
            are deployment options, not claims of completed provisioning. Local development uses a file index. Hosted
            persistence must be configured and verified.
          </p>
          <div className="cols-3" style={{ marginTop: 24 }}>
            {choices.map(([name, value, tradeoff]) => (
              <div className="card" key={name}>
                <h3>{name}</h3>
                <p>{value}</p>
                <p className="muted">Trade-off: {tradeoff}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="section" id="demo" data-present="true">
        <Reveal>
          <Intro n="03 / WORKING DEMO" title="One cascade. One next check. Sources you can inspect.">
            Use INC-0244 as the main story. The dependency map and handoff guidance are curated scenario context; the
            report is generated from retrieved evidence.
          </Intro>
          <div className="cols-3">
            <div className="card">
              <span className="eyebrow">01 · Localize</span>
              <h3>Follow connection waiting</h3>
              <p>
                Inspect E2's trace and E3's path measurements. Engage Network Platform with Inventory Services. A
                connection-path hypothesis does not identify a failed physical device.
              </p>
            </div>
            <div className="card">
              <span className="eyebrow">02 · Verify</span>
              <h3>Open a report citation</h3>
              <p>
                The source is the snapshot returned to that run. Show the owner handoff, the evidence that would confirm
                or challenge it, and the uncertainty.
              </p>
            </div>
            <div className="card">
              <span className="eyebrow">03 · Challenge</span>
              <h3>Retry, reconnect, then abstain</h3>
              <p>
                Use one transient telemetry failure and refresh while it runs. Then open INC-0243: missing evidence
                should lead to collection, not an operational experiment.
              </p>
            </div>
          </div>
          <div className="hero-cta" style={{ marginTop: 24 }}>
            <Link href={`/incidents/${customer.leadIncident}`} className="btn btn-primary btn-lg">
              Open the lead incident <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="cols-2" style={{ marginTop: 24 }}>
            <div className="card">
              <h3>Demo access</h3>
              {demoUrl ? (
                <a href={demoUrl}>{demoUrl}</a>
              ) : (
                <p>
                  This build is accessible from the workbench above. A verified public URL will be included with the
                  deployment handoff.
                </p>
              )}
              <p>
                Starting a run requires the separately shared reviewer code. Synthetic reports are readable without it.
              </p>
            </div>
            <div className="card">
              <h3>Source and history</h3>
              {repoUrl ? (
                <a href={repoUrl}>{repoUrl}</a>
              ) : (
                <p>
                  Public repository publication is pending. Both the original source history and the rebuild history are
                  preserved locally.
                </p>
              )}
              <p>Approval, model comparison, and detailed run accounting are available for technical discussion.</p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section" id="measures" data-present="true">
        <Reveal>
          <Intro n="04 / SUCCESS MEASURES" title="Agree pilot gates. Measure before claiming improvement.">
            These are proposed targets, not demonstrated customer outcomes. Establish the baseline with responders using
            the same sanitized historical incidents.
          </Intro>
          <div className="cols-3">
            <div className="card">
              <h3>Coordination</h3>
              <p>
                Target 20% fewer responder-minutes to an agreed next check. Measure cross-team participation and elapsed
                time, alongside incident severity.
              </p>
            </div>
            <div className="card">
              <h3>Quality</h3>
              <p>
                No unsupported critical claim in 20 human-reviewed pilot reports. Correct abstention on incomplete
                cases, with every citation inspectable.
              </p>
            </div>
            <div className="card">
              <h3>Performance and cost</h3>
              <p>
                Provisional targets: analysis p95 under 30 seconds and model cost under $0.05 per run. Track approval
                waiting separately; include compute, storage and retries in the full cost model.
              </p>
            </div>
          </div>
          <p className="note">
            Use real run accounting to calibrate these gates. Fake Gateway tests establish orchestration only; their
            timing and prices are not production measurements.
          </p>
        </Reveal>
      </section>

      <section className="section" id="rollout" data-present="true">
        <Reveal>
          <Intro n="05 / ROLLOUT" title="Pilot with one rotation. Keep the existing process available.">
            This is the proposed rollout. Preview, rollback and persistence rehearsals must be recorded for the actual
            hosted revision before calling it ready.
          </Intro>
          <div className="rollout">
            <div className="rollout-line" aria-hidden="true" />
            {rollout.map(([n, title, text]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="card highlight" style={{ marginTop: 24 }}>
            <h3>The decision to make together</h3>
            <p>
              Which would justify a pilot: fewer people on each bridge, an earlier evidence-backed customer update, or
              less time to assign the next check? Choose one primary business measure before expanding scope.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="section" id="risks">
        <Reveal>
          <Intro n="APPENDIX / LIMITATIONS & ALTERNATIVES" title="Boundaries to defend before kickoff." />
          <div className="cols-2">
            <div className="card">
              <h3>Drafts require judgment</h3>
              <p>
                Schema, retrieved-citation, owner and policy checks reject known failures. They cannot prove that a
                natural-language conclusion is true. The demo approval records a reviewer decision, never a production
                action.
              </p>
            </div>
            <div className="card">
              <h3>Residency is more than provider choice</h3>
              <p>
                A Bedrock allow-list does not pin inference to us-east-1. Account for Gateway routing, model processing,
                workflow state, cache, logs and the index. If a strict boundary cannot be met, change the design or
                decline the data flow.
              </p>
              <a href="https://vercel.com/docs/ai-gateway/models-and-providers/provider-options">
                Provider routing documentation ↗
              </a>
            </div>
            <div className="card">
              <h3>Operational limits</h3>
              <p>
                Local files are for a single developer process. Hosted runs require Postgres. A reserved but unconfirmed
                start is not automatically dispatched again; investigate it before creating a new request. A model retry
                can be billed twice. Configure spend limits and per-user controls for a pilot.
              </p>
            </div>
            <div className="card">
              <h3>Alternatives</h3>
              <p>
                Use the existing observability vendor's workflow when it already joins the necessary sources. An
                AWS-native agent and Step Functions may fit a strict AWS boundary. Relay fits when a tailored cross-tool
                experience and Vercel delivery workflow justify another application to operate.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section" id="tooling">
        <Reveal>
          <Intro n="APPENDIX / TOOLING & VALIDATION" title="AI-assisted development, with inspectable checks.">
            The first version used OpenAI Codex; Fable supplied a substantial rebuild. Codex reviewed and repaired
            evidence provenance, approval ordering, evaluation inputs and persistence handling. The presenter must be
            able to explain and modify the resulting code.
          </Intro>
          <div className="cols-2">
            <div className="card">
              <h3>What the checks cover</h3>
              <ul>
                <li>
                  Regression tests reject unknown citations and owners, missing reads, and unsafe incomplete-evidence
                  actions.
                </li>
                <li>
                  Eight model cases include missing path data, unlabeled uncertainty, misleading policy timing and
                  injected log instructions.
                </li>
                <li>
                  The workflow smoke suite covers healthy runs, abstention, retry, approval/decline, reconnect and a
                  full outage. Offline simulation is labeled separately.
                </li>
                <li>
                  Live evaluation validates reports and proposed actions against the exact tool transcript. Human review
                  remains a separate step.
                </li>
              </ul>
            </div>
            <div className="card">
              <h3>Latest live evaluation</h3>
              {evaluation ? (
                <>
                  <p>
                    {evaluation.model} · {evaluation.cases} cases · {evaluation.failures} automated failures ·{" "}
                    {new Date(evaluation.evaluatedAt).toISOString().slice(0, 10)}
                  </p>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Case</th>
                        <th>Result</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluation.results.map((r) => (
                        <tr key={r.name}>
                          <td>{r.name}</td>
                          <td>
                            {r.error
                              ? "Failed"
                              : r.assessmentPassed && !r.regressionFailures?.length
                                ? "Checks passed"
                                : "Review needed"}
                          </td>
                          <td>{r.totalCostUsd ? `$${Number(r.totalCostUsd).toFixed(4)}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="note">
                    Automated checks are not a human sign-off. Source review caught an unsupported status code even
                    after an earlier automated pass; that regression now has its own runtime guard. See the artifacts
                    for the failed attempts as well as the latest results.
                  </p>
                </>
              ) : (
                <p>
                  Fresh live-model results for this revision are pending. Historical results and simulated runs are not
                  evidence that this agent passes.
                </p>
              )}
            </div>
          </div>
          {candidate && (
            <div className="card" style={{ marginTop: 24 }}>
              <h3>Availability is not the same as report quality</h3>
              <p>
                The earlier candidate evaluation for {candidate.model} had {candidate.failures} failure(s) in{" "}
                {candidate.cases} cases. Normal runs therefore have automatic cross-model fallback disabled. Explicit
                comparison and outage drills can test the candidate; rejected reports are withheld. A successful Gateway
                routing probe does not qualify a model for a pilot.
              </p>
            </div>
          )}
          <div className="card" style={{ marginTop: 24 }}>
            <h3>Product feedback from this build</h3>
            <p>
              Durable steps and hooks made retry and approval behavior concrete. Gateway's routing and cost metadata
              were useful, but the actual fallback model appeared in nested routing metadata while the response still
              named the requested model. A typed accounting helper would help. A reference application combining
              idempotent starts, retained evidence, a report index and deployment versioning would also reduce integration work.
            </p>
          </div>
        </Reveal>
      </section>
      <footer className="proposal-foot">
        <span>Relay · technical exercise with Vercel · fictional customer and synthetic telemetry</span>
        <span>
          <a href="https://workflow-sdk.dev/docs/foundations/versioning">Workflow versioning</a> ·{" "}
          <a href="https://vercel.com/docs/fluid-compute">Compute and billing</a>
        </span>
      </footer>
    </main>
  );
}
