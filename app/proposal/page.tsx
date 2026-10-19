import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Suspense } from "react";
import { Icon, Logo } from "@/components/icons";
import { Hero } from "@/components/hero";
import { Presenter } from "@/components/presenter";
import { MotionToggle, PresentationMotion } from "@/components/presentation-motion";
import {
  ArchitectureVisual,
  CascadeVisual,
  InvestigationVisual,
  PilotVisual,
  RolloutVisual,
} from "@/components/proposal-visuals";
import "./presentation.css";

const repoUrl = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/exuepdx/relay-incident-workbench";
const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || "https://relay-incident-workbench.vercel.app";

type Evaluation = {
  mode: string;
  model: string;
  evaluatedAt: string;
  cases: number;
  failures: number;
  results: Array<{
    name: string;
    error?: string;
    assessmentPassed?: boolean;
    regressionFailures?: string[];
    totalCostUsd?: string | null;
  }>;
};
function loadEvaluation(file: string): Evaluation | null {
  try {
    const artifact = JSON.parse(readFileSync(join(process.cwd(), "artifacts", file), "utf8"));
    return artifact.mode === "live" ? artifact : null;
  } catch {
    return null;
  }
}

function Heading({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <header className="slide-heading">
      <span className="slide-number">{n}</span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </header>
  );
}
function Notes({ children }: { children: React.ReactNode }) {
  return (
    <details className="slide-notes">
      <summary>
        <Icon name="info" size={14} /> Discussion notes
      </summary>
      <div>{children}</div>
    </details>
  );
}

export default function Proposal() {
  const evaluation = loadEvaluation("evaluation.json");
  const candidate = loadEvaluation("evaluation-gemini-repair.json");
  const passed =
    evaluation?.results.filter((r) => !r.error && r.assessmentPassed && !r.regressionFailures?.length).length ?? 0;
  // Read only display measurements from the same synthetic fixture as the API.
  // This diagram does not infer topology or call a model.
  const catalog = JSON.parse(readFileSync(join(process.cwd(), "customer-api/data/incidents.json"), "utf8"));
  const spans = catalog["INC-0244"].spans as Array<{ duration: number }>;
  return (
    <PresentationMotion>
      <main className="proposal visual-proposal">
        <Suspense fallback={null}>
          <Presenter />
        </Suspense>
        <Hero>
          <nav className="hero-nav" aria-label="Presentation">
            <Link href="/" aria-label="Relay home">
              <Logo />
            </Link>
            <div className="hero-nav-links">
              <a href="#problem">The incident</a>
              <a href="#architecture">Architecture</a>
              <Link href="/proposal?present=1#overview" className="btn btn-ghost present-link">
                Present
              </Link>
              <MotionToggle />
            </div>
          </nav>
          <div className="hero-body">
            <div className="hero-copy">
              <span className="eyebrow">Relay / technical demo</span>
              <h1>
                Investigating a<br />
                <em>retail checkout outage.</em>
              </h1>
              <p>A workbench for tracing checkout failures across application, database and network teams.</p>
              <div className="hero-cta">
                <a href="#problem" className="btn btn-primary btn-lg">
                  Explore the scenario <Icon name="arrow" size={16} />
                </a>
                <Link href="/incidents/INC-0244" className="btn btn-lg">
                  Open live demo
                </Link>
              </div>
              <div className="hero-context">
                <span>Northstar Commerce</span>
                <span>Fictional retailer · synthetic telemetry</span>
              </div>
            </div>
          </div>
          <div className="hero-flow-labels" aria-hidden="true">
            <span>Telemetry API</span>
            <i>→</i>
            <span>Vercel investigation</span>
            <i>→</i>
            <span>Saved report</span>
          </div>
        </Hero>

        <section className="section visual-slide" id="problem" data-present="true" data-title="The incident">
          <Heading n="01 / THE INCIDENT" title="One checkout delay. Four teams involved.">
            The investigation starts with a shared dependency path.
          </Heading>
          <CascadeVisual durations={spans.slice(0, 4).map((span) => span.duration)} />
          <div className="slide-bottom">
            <Notes>
              <p>
                Based on enterprise retail outage calls where teams had telemetry but spent time correlating symptoms
                and establishing ownership. The business consequence is responder time and delayed recovery while
                customer transactions remain degraded.
              </p>
              <p>
                The longest span in this example is the inventory-to-database connection wait. Rejected-flow evidence
                supports investigating that path; it does not identify a physical device or prove the policy change
                caused the outage.
              </p>
              <p>
                <strong>Discovery:</strong> Where does your team lose the most time: accessing evidence, agreeing on the
                path, or finding the owner?
              </p>
            </Notes>
            <span>INC-0244 · prepared scenario context</span>
          </div>
        </section>

        <section className="section visual-slide" id="architecture" data-present="true" data-title="Architecture">
          <Heading n="02 / ARCHITECTURE" title="Connect the telemetry you already have.">
            Vercel hosts the investigation; the customer's operational systems stay in place.
          </Heading>
          <ArchitectureVisual />
          <div className="slide-bottom">
            <Notes>
              <p>
                <strong>What stays:</strong> business services, transaction databases, release pipelines, ingestion,
                alerting and source retention. The proposed example stack is EKS, RDS Postgres, Jenkins and an
                observability platform.
              </p>
              <p>
                <strong>Actual demo:</strong> the synthetic API is deployed in a separate Vercel project, with
                bearer-token authentication. Neon stores reports. The included Lambda adapter has not been deployed to
                AWS.
              </p>
              <p>
                <strong>Data boundary:</strong> selected evidence, prompts, tool results and operational metadata enter
                Vercel and the model provider. A customer-controlled report database does not relocate Workflow state. A
                pilot needs agreed redaction, retention and private connectivity where required.
              </p>
            </Notes>
            <span>Click a layer to see its purpose and trade-off</span>
          </div>
        </section>

        <section className="section visual-slide" id="demo" data-present="true" data-title="Investigation">
          <Heading n="03 / INVESTIGATION" title="From telemetry to a reviewable report.">
            Step through the workflow, then try the real incident.
          </Heading>
          <InvestigationVisual />
          <div className="slide-bottom">
            <Notes>
              <p>
                All three read tools must complete. Citation, owner and incident-policy checks run against their
                returned evidence before any approval is offered. Reports retain that snapshot even if the catalog later
                changes.
              </p>
              <p>
                Starts reserve an idempotency key before dispatch. A lost response reconnects to the existing request;
                an ambiguous reservation is not automatically dispatched twice. Workflow retries can add model cost.
              </p>
              <p>
                Approval is optional and uses the shared demo reviewer identity. It records a decision and executes no
                operational change. Production execution would need verified owner identity, scoped permissions and an
                audited rollback path.
              </p>
              <p>
                <strong>Access:</strong> enter the separately shared reviewer code, select Unlock, then Run
                investigation. Saved synthetic reports are public.
              </p>
            </Notes>
            <Link className="btn btn-primary" href="/incidents/INC-0244">
              Run the live investigation <Icon name="arrow" size={15} />
            </Link>
          </div>
        </section>

        <section className="section visual-slide" id="measures" data-present="true" data-title="Pilot targets">
          <Heading n="04 / PILOT TARGETS" title="Measure coordination, quality and cost.">
            Agree the baseline with one on-call rotation before expanding.
          </Heading>
          <PilotVisual cases={evaluation?.cases ?? 0} passed={passed} />
          <div className="slide-bottom">
            <Notes>
              <p>
                Use the same sanitized historical incidents for baseline and pilot runs. Track severity, elapsed time
                and participants to measure responder-minutes to an agreed next check.
              </p>
              <p>
                The 20% improvement, 20-report quality sample, 30-second p95 and $0.05 model cost are proposed targets.
                Approval waiting is separate from analysis latency; compute, storage and retries belong in the full cost
                model.
              </p>
              <p>
                The eight primary-model cases were collected in two batches under the same prompt and report contract
                after the first attempt reached its budget. Offline tests prove orchestration; their timing and prices
                are simulated.
              </p>
            </Notes>
            <a href={`${repoUrl}/blob/main/artifacts/README.md`}>Inspect the recorded results ↗</a>
          </div>
        </section>

        <section className="section visual-slide" id="rollout" data-present="true" data-title="Rollout">
          <Heading n="05 / ROLLOUT" title="Introduce Relay one rotation at a time.">
            Keep a tested path back while the pilot proves its value.
          </Heading>
          <RolloutVisual />
          <div className="slide-bottom">
            <Notes>
              <p>
                <strong>Preview:</strong> synthetic data and isolated credentials. <strong>Validate:</strong> regression
                checks, live evaluations and responder review. <strong>Canary:</strong> limited rotation access
                alongside the current process. <strong>Cutover:</strong> expand after the agreed gates.{" "}
                <strong>Rollback:</strong> restore the previous deployment or revoke pilot access.
              </p>
              <p>
                A real workflow started on deployment A and completed after promotion to B. It stayed pinned to A. Its
                report and evidence hash survived rollback and restoration. The cohort diagram is a proposed rollout,
                not a claim of configured percentage traffic splitting.
              </p>
              <p>
                CI runs tests and builds. Hosted validation and promotion currently use the CLI; the optional GitHub
                preview integration is not configured.
              </p>
            </Notes>
            <a href={`${repoUrl}/blob/main/artifacts/deployment-rollback.json`}>Promotion & rollback evidence ↗</a>
          </div>
        </section>

        <section className="section deck-appendix" id="notes">
          <Heading n="REFERENCE" title="Technical notes and evidence">
            Details for the discussion, available without crowding the walkthrough.
          </Heading>
          <div className="appendix-links">
            <a className="btn" href={demoUrl}>
              Live demo ↗
            </a>
            <a className="btn" href={repoUrl}>
              GitHub ↗
            </a>
            <Link className="btn" href="/proposal?present=1#overview">
              Present six screens
            </Link>
          </div>
          <details>
            <summary>Architecture trade-offs and production requirements</summary>
            <div className="appendix-body">
              <p>
                Next.js separates the static shell, cached catalog and request-time run state. Refresh invalidates an
                incident's cache; each report retains its own source snapshot. Workflows manages execution and approval
                waits, while Postgres retains the report index beyond workflow execution retention.
              </p>
              <p>
                A fixed retrieval pipeline plus one model call is a simpler alternative worth comparing: all three reads
                are mandatory. The agent adds conditional tool ordering and an optional proposal, at the cost of more
                model steps.
              </p>
              <p>
                SSO, verified service-owner permissions, data retention and network access need customer agreement. A
                provider allow-list alone does not establish regional residency. The evidence, prompts, cache, logs,
                Workflow state, database and model processing all need review.
              </p>
              <p>
                Use the existing observability vendor's workflow if it already joins the required sources. An AWS-native
                design may suit a strict AWS boundary.
              </p>
              <a href={`${repoUrl}/blob/main/docs/decisions.md`}>Full decision record ↗</a>
            </div>
          </details>
          <details id="tooling">
            <summary>Development tools and validation</summary>
            <div className="appendix-body">
              <p>
                Codex assisted the initial implementation and repairs; Fable supplied a substantial rebuild. Both
                histories are preserved. Review addressed evidence provenance, approval ordering, misleading evaluation
                inputs, persistence and report wording.
              </p>
              <p>
                Regression tests cover unknown citations and owners, missing reads, incomplete-evidence actions and
                duplicate starts. Hosted scenarios cover healthy runs, abstention, retry, approval, decline, pause and
                full outage.
              </p>
              <p>
                Automated checks do not prove every natural-language conclusion. Review the sources, uncertainty and
                action status before sharing a customer update.
              </p>
              <a href={`${repoUrl}/blob/main/docs/repair-verification.md`}>Repairs and verification ↗</a>
            </div>
          </details>
          <details>
            <summary>
              Live model evaluations{" "}
              {evaluation ? `· ${passed}/${evaluation.cases} primary cases passed` : "· unavailable"}
            </summary>
            <div className="appendix-body">
              {evaluation ? (
                <>
                  <p>
                    {evaluation.model} · {new Date(evaluation.evaluatedAt).toISOString().slice(0, 10)} · automated
                    checks
                  </p>
                  <div className="eval-table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Case</th>
                          <th>Result</th>
                          <th>Model cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluation.results.map((result) => (
                          <tr key={result.name}>
                            <td>{result.name}</td>
                            <td>
                              {result.error
                                ? "Failed / blocked"
                                : result.assessmentPassed && !result.regressionFailures?.length
                                  ? "Passed"
                                  : "Review needed"}
                            </td>
                            <td>{result.totalCostUsd ? `$${Number(result.totalCostUsd).toFixed(4)}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p>Live results are unavailable in this build.</p>
              )}
              {candidate && (
                <p>
                  Automatic fallback is disabled: {candidate.model} failed {candidate.failures} of {candidate.cases}{" "}
                  candidate cases. Explicit comparison and provider-outage drills remain available; successful routing
                  does not qualify report quality.
                </p>
              )}
              <a href={`${repoUrl}/blob/main/artifacts/README.md`}>Current results and earlier failures ↗</a>
            </div>
          </details>
          <details>
            <summary>Product feedback from building Relay</summary>
            <div className="appendix-body">
              <ul>
                <li>Durable steps and approval hooks made retry and pause behavior straightforward to demonstrate.</li>
                <li>
                  A side-effect database registration failed in the hosted Workflow bundle; an explicit import fixed it.
                  A reference example would help.
                </li>
                <li>
                  Gateway's actual fallback model was in nested routing metadata, while the response named the requested
                  model. A typed accounting helper would make this easier to use correctly.
                </li>
                <li>
                  A reference app combining idempotent starts, retained evidence, report storage and deployment
                  versioning would reduce integration work.
                </li>
              </ul>
              <a href={`${repoUrl}/blob/main/docs/product-feedback.md`}>Detailed product feedback ↗</a>
            </div>
          </details>
        </section>
        <footer className="proposal-foot">
          <span>Relay · technical exercise with Vercel · synthetic scenario</span>
          <a href={repoUrl}>Source & development history ↗</a>
        </footer>
      </main>
    </PresentationMotion>
  );
}
