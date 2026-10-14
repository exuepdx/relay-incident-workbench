import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Icon, Logo } from "@/components/icons";
import { customer } from "@/lib/customer";
import { config } from "@/lib/config";

/**
 * The customer-ready artifact. Eight sections, in the order the exercise asks
 * for them. Static: everything here is known at build time.
 */

const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || "";
const repoUrl = process.env.NEXT_PUBLIC_REPO_URL || "";

type EvalArtifact = { evaluatedAt: string; model: string; cases: number; failures: number; results: Array<{ name: string; assessmentPassed?: boolean; allToolsCalled?: boolean; regressionFailures?: string[]; totalCostUsd?: string | null; elapsedMs?: number; error?: string; report?: { assessment: string } }> };
function loadEval(): EvalArtifact | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "artifacts", "evaluation.json"), "utf8")) as EvalArtifact;
  } catch {
    return null;
  }
}

const primitives: Array<[string, string, string, string]> = [
  ["Vercel Workflows", "Every investigation is a durable run. Tool calls are retried steps; a crash, a deploy, or a 503 from the customer side resumes from the last completed step. The browser holds a run id, nothing else.", "A stateful dependency with its own retention (1 day Hobby, 7 Pro, 30 Enterprise). The index of completed investigations lives in the customer's Postgres for that reason.", "https://vercel.com/docs/workflows"],
  ["AI SDK (WorkflowAgent)", "One agent definition, three read-only tools, structured output validated against the evidence the agent actually read. The same definition runs in the eval harness.", "Structured output is not truth. Citation checks and a deterministic guard catch known failure modes; human review stays in the loop.", "https://workflow-sdk.dev/docs/ai"],
  ["AI Gateway", "One model boundary: ordered model fallbacks, provider ordering or allow-lists, and per-call cost, tokens, and generation ids. Swapping or constraining a model is an environment variable.", "The Gateway hop is a Vercel service. If a customer cannot route through it, the AI SDK provider swap to direct Bedrock is one line, and the fallback logic moves to the application.", "https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks"],
  ["Next.js 16 Cache Components", "Static shell at build; each incident is a cached, tagged segment filled on first request; saved runs and the live run stream at request time. Refreshing one incident expires one tag.", "Explicit caching is a decision per segment. Teams used to implicit caching need the mental model: static, cached, or streamed.", "https://nextjs.org/docs/app/getting-started/caching"],
  ["Functions on Fluid compute", "An investigation is three serial I/O-bound calls plus model time. Fluid bills active CPU, not wall-clock, so waiting on the customer API and the model is cheap.", "Compute cost is small next to model cost; the budget conversation is about Gateway spend.", "https://vercel.com/docs/fluid-compute"],
  ["Preview Deployments and Instant Rollback", "Every pull request gets a URL pointed at the same customer API with a separate token. Promotion is a click; rollback keeps the previous deployment live. Rolling Releases add percentage canaries on Pro.", "A rollback restores code, not workflow state. In-flight runs finish on the deployment that started them.", "https://vercel.com/docs/rolling-releases"],
];

const rollout: Array<[string, string, string]> = [
  ["01", "Preview", "Each change ships as a Preview Deployment against the synthetic telemetry API with a preview-only token. Reviewers run the seven-case eval and the smoke script before approving."],
  ["02", "Validate", "Confirm data handling with security: which fields leave the estate, model routing constraints, retention. Set the Gateway budget and alert thresholds."],
  ["03", "Canary", "Invite one on-call rotation through the existing access group. On Pro, a 10 percent Rolling Release with Skew Protection for the UI. Compare time-to-hypothesis against the previous rotation."],
  ["04", "Cutover", "Expand when the quality gate holds for two weeks: zero unsupported critical claims, correct abstention on every known incomplete case, cost per run under target."],
  ["05", "Rollback", "Instant Rollback to the previous deployment, or remove the access group. Workflow runs in flight finish on their own deployment; the Postgres index is unaffected."],
];

export default function Proposal() {
  const evaluation = loadEval();
  return (
    <main className="proposal">
      <nav className="proposal-nav" aria-label="Proposal">
        <Link href="/" aria-label="Relay home">
          <Logo />
        </Link>
        <nav>
          <a href="#architecture">Architecture</a>
          <a href="#choices">Vercel choices</a>
          <a href="#demo">Demo</a>
          <a href="#rollout">Rollout</a>
          <a href="#risks">Risks</a>
          <Link href={`/incidents/${customer.leadIncident}`} className="btn btn-primary">
            Open the workbench <Icon name="arrow" size={14} />
          </Link>
        </nav>
      </nav>

      <header className="hero">
        <span className="eyebrow">Technical proposal · {customer.name}</span>
        <h1>
          Your telemetry already knows.
          <br />
          <em>Relay gets the bridge to the next check faster.</em>
        </h1>
        <p>
          An incident investigation agent that runs on Vercel and reads the telemetry {customer.short} already has. It proposes the next check, names the accountable team, and drafts the customer update, with every claim cited. Your systems stay where they are. Your people decide.
        </p>
        <div className="hero-meta">
          <div>
            Customer <strong>{customer.name} ({customer.industry})</strong>
          </div>
          <div>
            Vercel's role <strong>Connect: the application and agent layer</strong>
          </div>
          <div>
            First slice <strong>Checkout incident response</strong>
          </div>
        </div>
      </header>

      {/* 1. Problem statement */}
      <section className="section" id="problem">
        <div className="section-intro">
          <span className="section-n">01 / PROBLEM</span>
          <div>
            <h2>The first twenty minutes of every sev-1 are spent assembling evidence by hand.</h2>
            <p>
              {customer.short} runs checkout and inventory on {customer.cloud} {customer.compute} with {customer.database}, an external payments provider, and {customer.observability}. The telemetry is complete. The coordination is not.
            </p>
          </div>
        </div>
        <div className="cols-2">
          <div className="card">
            <span className="eyebrow">Current state</span>
            <h3>Five teams, one bridge, no shared evidence</h3>
            <ul>
              <li>A checkout alert pulls application, inventory, database, network, and payments on-call engineers onto the same call.</li>
              <li>Each team checks its own dashboards; nobody owns the question "which dependency do we chase next, and who owns the check?"</li>
              <li>The first customer update is written from memory, often with claims that the evidence does not support.</li>
            </ul>
          </div>
          <div className="card">
            <span className="eyebrow">What the tooling team tried</span>
            <h3>An AI helper on Lambda that did not survive production</h3>
            <ul>
              <li>Investigations run 20 to 60 seconds; API Gateway cuts them off at 29. Retries, timeouts, and state were hand-rolled.</li>
              <li>One model, one provider, no failover. When the provider degraded the helper did too.</li>
              <li>No cost per investigation, so Finance could not say what a month of use would cost.</li>
              <li>Internal tools ship through the same {customer.releasePipeline} pipeline as checkout: 45-minute deploys and no preview environments.</li>
            </ul>
          </div>
        </div>
        <div className="card highlight" style={{ marginTop: 18 }}>
          <span className="eyebrow">Why it matters</span>
          <p>
            Every minute of coordination is a minute of degraded checkout. Responder time across five teams is the largest hidden cost of an incident, and an unsupported claim in a customer update is a trust cost that outlives the outage. The target is a shorter path from alert to an agreed next check, with evidence attached.
          </p>
        </div>
      </section>

      {/* 2. Architecture */}
      <section className="section" id="architecture">
        <div className="section-intro">
          <span className="section-n">02 / ARCHITECTURE</span>
          <div>
            <h2>Vercel runs the application and the agent. Everything that holds data stays.</h2>
            <p>The boundary is a read-only, authenticated HTTPS API that {customer.short} already exposes from its observability platform. Relay crosses it with a scoped credential and nothing else.</p>
          </div>
        </div>
        <div className="arch">
          <div className="zone">
            <span className="eyebrow">Vercel · application and agent layer</span>
            <h3>Relay</h3>
            <div className="zone-node">
              <b>Next.js 16 on Fluid compute</b>
              <small>Static shell, cached incident segments, streamed runs, reviewer session</small>
            </div>
            <div className="zone-node">
              <b>Vercel Workflows</b>
              <small>brief → tools (durable steps) → validate → persist · region-pinned to {config.region}</small>
            </div>
            <div className="zone-node">
              <b>AI SDK WorkflowAgent → AI Gateway</b>
              <small>
                {config.model} with fallbacks {config.fallbackModels.join(", ")} · cost per run
              </small>
            </div>
          </div>
          <div className="arch-arrow">
            <Icon name="arrow" size={24} />
            <span>HTTPS, bearer, read-only</span>
          </div>
          <div className="zone customer">
            <span className="eyebrow">{customer.name} · what stays, and why</span>
            <h3>The existing estate</h3>
            <div className="zone-node">
              <b>Telemetry API ({customer.region})</b>
              <small>Metrics, traces, changes, incident records. Stays: retention, ingestion, and alerting are mature and regulated.</small>
            </div>
            <div className="zone-node">
              <b>{customer.compute} services + {customer.database}</b>
              <small>Checkout, inventory, orders. Stays: tested business rules, data placement, and operational ownership.</small>
            </div>
            <div className="zone-node">
              <b>Postgres investigation index</b>
              <small>Who ran what, when, at what cost, and the report. Stays: this is the customer's record, in their database.</small>
            </div>
            <div className="zone-node">
              <b>Identity, approvals, {customer.modelProvider}</b>
              <small>SSO gates production access; service owners approve changes; Bedrock can serve models behind Gateway.</small>
            </div>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 14, fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
          In the demo the telemetry API is a synthetic service on an AWS Lambda function URL in us-east-1 and the index is a Neon Postgres database. In production the API is the customer's observability vendor or an adapter in their VPC, reached through Secure Compute static IPs or VPC peering, and the index is a table in their RDS. Nothing about the application changes.
        </p>
      </section>

      {/* 3. Vercel choices */}
      <section className="section" id="choices">
        <div className="section-intro">
          <span className="section-n">03 / VERCEL CHOICES</span>
          <div>
            <h2>Six primitives, each answering a named pain.</h2>
            <p>Fewer, well-chosen pieces. Each row names what it buys the customer and the trade-off we accept.</p>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Primitive</th>
              <th>What it buys {customer.short}</th>
              <th>Trade-off we own</th>
            </tr>
          </thead>
          <tbody>
            {primitives.map(([name, value, tradeoff, url]) => (
              <tr key={name}>
                <td>
                  <a href={url}>{name} ↗</a>
                </td>
                <td>{value}</td>
                <td>{tradeoff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 4. Working demo */}
      <section className="section" id="demo">
        <div className="section-intro">
          <span className="section-n">04 / WORKING DEMO</span>
          <div>
            <h2>Deployed, public, and reviewable in five minutes.</h2>
            <p>Four incidents are loaded. Open the lead incident, enter the reviewer code from the submission email, and press Run. Then break something from the Test resilience panel.</p>
          </div>
        </div>
        <div className="cols-3">
          <div className="card">
            <span className="eyebrow">Public URL</span>
            <h3>{demoUrl ? <a href={demoUrl}>{demoUrl.replace(/^https?:\/\//, "")}</a> : "Set NEXT_PUBLIC_DEMO_URL"}</h3>
            <p>Reviewer code: in the submission email. Starting a run needs it; reading does not.</p>
          </div>
          <div className="card">
            <span className="eyebrow">Public repository</span>
            <h3>{repoUrl ? <a href={repoUrl}>{repoUrl.replace(/^https?:\/\//, "")}</a> : "Set NEXT_PUBLIC_REPO_URL"}</h3>
            <p>Full commit history. Each commit message explains the decision it carries. Comments mark the deliberate ones.</p>
          </div>
          <div className="card">
            <span className="eyebrow">What to try</span>
            <ul>
              <li>Run INC-0244 and click a citation.</li>
              <li>Transient 503: watch the tool step retry.</li>
              <li>Provider outage: watch Gateway fall back and read the model attempts.</li>
              <li>Refresh mid-run: the run continues.</li>
              <li>INC-0243: the agent must abstain.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Rollout */}
      <section className="section" id="rollout">
        <div className="section-intro">
          <span className="section-n">05 / ROLLOUT PLAN</span>
          <div>
            <h2>Preview, validate, canary, cut over, roll back.</h2>
            <p>The original incident process stays available for the whole pilot. Relay earns expansion with data.</p>
          </div>
        </div>
        <div className="rollout">
          {rollout.map(([n, title, text]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 22 }}>
          <span className="eyebrow">An incident mid-rollout</span>
          <p>
            A bad release is caught by the canary metrics or by a responder. Instant Rollback points production back at the previous deployment in seconds; nobody re-deploys. Runs started on the canary finish on the canary because Workflows pins a run to its deployment. The index in Postgres is untouched. Afterwards the Preview Deployment of the fix gets the same eval and smoke gate before promotion.
          </p>
        </div>
      </section>

      {/* 6. Success measures */}
      <section className="section" id="measures">
        <div className="section-intro">
          <span className="section-n">06 / SUCCESS MEASURES</span>
          <div>
            <h2>Measured against the last rotation, not against a slide.</h2>
            <p>Baseline on sanitized historical incidents with {customer.short}'s own responders. These are the pilot gates.</p>
          </div>
        </div>
        <div className="cols-3">
          <div className="card">
            <span className="eyebrow">Technical</span>
            <h3>Faster to an agreed next check</h3>
            <ul>
              <li>30 percent lower median time from alert to an evidence-backed hypothesis, paired against manual investigation.</li>
              <li>Report ready in under 30 seconds p95; retrieval and model time tracked separately.</li>
              <li>Zero runs lost to a crash, deploy, or customer-side 503 (durable steps).</li>
            </ul>
          </div>
          <div className="card">
            <span className="eyebrow">Quality</span>
            <h3>No unsupported critical claims</h3>
            <ul>
              <li>Every finding cites evidence the agent read; unknown citations fail the run.</li>
              <li>Correct abstention on every known incomplete case.</li>
              <li>Human review of 20 pilot reports before expansion.</li>
            </ul>
          </div>
          <div className="card">
            <span className="eyebrow">Business</span>
            <h3>Less coordination, more certainty</h3>
            <ul>
              <li>20 percent fewer responder-minutes across teams per incident.</li>
              <li>Cost per investigation under $0.05, visible per run and per month in Gateway.</li>
              <li>First customer update sent sooner and never retracted.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. Risks */}
      <section className="section" id="risks">
        <div className="section-intro">
          <span className="section-n">07 / KNOWN LIMITATIONS AND RISKS</span>
          <div>
            <h2>What we would say before kickoff.</h2>
          </div>
        </div>
        <div className="cols-2">
          <div className="card">
            <h3>This demo is synthetic</h3>
            <p>The telemetry, the customer, and the incidents are fictional. The reviewer code is a shared gate, not SSO. Reads are open because nothing is sensitive. A pilot gets SSO, tenant authorization, and per-user cost attribution.</p>
          </div>
          <div className="card">
            <h3>Data placement</h3>
            <p>Workflow run state is pinned to {config.region} and retained per plan. The model hop goes through AI Gateway; Gateway's provider allow-list keeps inference on Bedrock if required. If no data may transit Vercel's gateway, the AI SDK provider is swapped to direct Bedrock and fallback moves into the application.</p>
          </div>
          <div className="card">
            <h3>Model output is a draft</h3>
            <p>Schema, citation, and policy checks catch structural failures and the regressions we have seen. They do not prove a claim is true. Service owners approve every action. Nothing in Relay writes to a production system.</p>
          </div>
          <div className="card">
            <h3>Operational</h3>
            <p>Runs cost about $0.01 to $0.03 each in Gateway; a monthly hard limit returns 402 past budget. There is no global rate limiter beyond the session gate. Durable execution is not exactly-once inference billing: a retried model call can be billed twice.</p>
          </div>
        </div>
      </section>

      {/* 8. Development tooling */}
      <section className="section" id="tooling">
        <div className="section-intro">
          <span className="section-n">08 / DEVELOPMENT TOOLING AND AI VALIDATION</span>
          <div>
            <h2>Built with AI tools. Validated with a harness, not vibes.</h2>
            <p>
              A first iteration (single model call, no tools) was scaffolded with OpenAI Codex and reviewed. This rebuild was done with Claude Code in a terminal; the agent, Gateway routing, rendering, persistence, and evaluation layers were redesigned from that review. Every file is mine to explain.
            </p>
          </div>
        </div>
        <div className="cols-2">
          <div className="card">
            <h3>How behaviour is validated</h3>
            <ul>
              <li><code>npm test</code>: 20 unit tests on contracts, access, the customer API, tool wiring, accounting, and the eval cases.</li>
              <li><code>npm run eval</code>: seven cases through the real agent; checks structure, citations, expected assessment, tool use, and regressions. Artifacts carry prompt and evidence hashes.</li>
              <li><code>npm run smoke</code>: five end-to-end runs including the 503 retry, the provider-outage drill, and a full outage, against the offline fake Gateway or a deployment.</li>
              <li>Human review rubric per case; the known failure (one observed 504 becoming "frequent 504s") is a committed fixture and a deterministic guard.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Latest evaluation</h3>
            {evaluation ? (
              <>
                <p>
                  {new Date(evaluation.evaluatedAt).toLocaleString()} · {evaluation.model} · {evaluation.cases} cases · {evaluation.failures} failures
                </p>
                <table className="table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Assessment</th>
                      <th>Checks</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation.results.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td>{r.report?.assessment ?? r.error ?? "—"}</td>
                        <td>{r.error ? "failed" : [r.assessmentPassed ? "assessment ✓" : "assessment ✗", r.allToolsCalled ? "tools ✓" : "tools ✗", r.regressionFailures?.length ? `regressions: ${r.regressionFailures.join("; ")}` : "regressions ✓"].join(" · ")}</td>
                        <td>{r.totalCostUsd ? `$${Number(r.totalCostUsd).toFixed(4)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p>
                Run <code>npm run eval</code> with Gateway access to produce <code>artifacts/evaluation.json</code>; it renders here. Iteration-1 artifacts, including the regression that motivated the wording guard, are in <code>artifacts/</code>.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="cta">
        <div>
          <h2>Start with one incident.</h2>
          <p>Run it, click a citation, break the telemetry API, and watch the run survive.</p>
        </div>
        <Link href={`/incidents/${customer.leadIncident}`} className="btn btn-primary btn-lg">
          Open the workbench <Icon name="arrow" size={16} />
        </Link>
      </div>
      <footer className="proposal-foot">
        <span>
          Relay · technical exercise for Vercel · {customer.name} is fictional and all telemetry is synthetic.
        </span>
        <span>
          <a href="https://vercel.com/docs">Vercel docs</a> · <a href="https://workflow-sdk.dev">Workflow SDK</a> · <a href="https://ai-sdk.dev">AI SDK</a>
        </span>
      </footer>
    </main>
  );
}
