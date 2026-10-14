# Customer conversation and demo rehearsal

Use `/proposal` as the customer-facing asset. These are speaker notes, not a script
to read verbatim. Replace fictional discovery assumptions with your own language
and experience; do not imply that Northstar is a real customer you supported.

## Your opening, grounded in the experience you described

“In enterprise observability conversations, I saw a retailer repeatedly pull
application, infrastructure, and network teams into war rooms for customer-facing
outages. They had telemetry, but it lived across disparate systems. Cascading
symptoms made it hard to scope the blast radius and identify the next team to
engage. Several teams spent time proving their system wasn't the source. Relay
explores whether a shared, evidence-backed investigation can shorten that triage
and reduce total responder effort while preserving the existing systems.”

Then disclose: “Northstar and the incidents shown here are synthetic. They
illustrate that pattern; they are not the real retailer's architecture or data.”

Ask: “Is assembling evidence and agreeing ownership still a material delay for
your responders? What does your existing vendor already do well here?”

## A 12-minute flow

| Time        | Show                               | Say / establish                                                                                                                               |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:30   | Proposal opportunity               | “You already have telemetry. What slows response is turning multiple signals into an agreed next step.” Validate the pain before the product. |
| 1:30–3:00   | Boundary diagram                   | Workloads and observability stay. Vercel adds the response experience, durable execution, and model boundary.                                 |
| 3:00–6:00   | Cascading network investigation    | Follow checkout → inventory → DB path, inspect an owner and citation, show unknown underlay coverage, run live AI, copy a proposed handoff.              |
| 6:00–7:30   | Counter-evidence / incomplete case | A nearby deploy is not necessarily responsible. Missing spans should cause uncertainty, not a confident story.                                |
| 7:30–9:00   | Resilience controls and saved runs | First-request 503 recovers; persistent outage returns no diagnosis. Refresh and reconnect. Explain retry and state boundaries.                |
| 9:00–10:00  | Run accounting                     | Show actual input/output tokens, model time, cost when returned, and the project budget. Explain what cost excludes.                          |
| 10:00–12:00 | Pilot and success measures         | Preview, validation, cohort rollout, expansion gates, rollback, and known limitations. Ask whether these are the right pilot outcomes.        |

If live inference is unavailable, say so explicitly and use the authored sample to
rehearse UX and workflow behavior. Do not present the sample as proof of live model
quality. Before the interview, run the live evaluation and record its results.

## The key moment in the network demo

Select **DB network path**, then **Physical underlay**. Say: “These sampled signals
give Network Platform and Inventory Services a joint next check. They do not
identify a broken switch, prove the policy caused it, or clear the database team.
The map and handoffs are curated catalog/evidence context; AI synthesizes the
report. Each completed run retains the snapshot we actually used.” Expand
**Confirm or challenge this lead**, then copy the handoff. Explain that this copies
a proposed investigation brief, not an assignment or an automated operational action.

In the code discussion, show the wrong-subnet evaluation: connection delays remain,
but the policy and rejects belong to analytics. The output must follow the changed
evidence. The missing-path case removes both measurements and derived topology.

## Discovery questions you should be ready to ask

1. Which customer journey has the highest incident coordination cost?
2. Where does response time actually go: finding evidence, interpreting it, or approving changes?
3. Which existing observability/incident tools already address this gap?
4. Which telemetry may leave the environment, and which identities can see it?
5. Is the pilot success metric responder effort, recovery time, or customer communication?

## Objections and curveballs

**“Our observability vendor already has AI.”**
Use it if it meets the need. Relay is justified by a specific customer workflow,
multiple evidence sources, and a customized response experience—not by replacing
a mature telemetry platform. Verify an unmet need before recommending a build.

**“Nothing can leave us-east-1.”**
Stop and define “nothing”: raw logs, derived summaries, model prompts, retained
workflow state, and audit logs all count. iad1 alone proves none of the latter.
Validate each component's regional guarantees and allowed provider routing. If
they cannot comply, disable inference/export and keep synthesis inside the approved
boundary; retain only the interface that meets policy. Do not promise a region
guarantee without evidence.

**“The sessions store cannot move.”**
Browser history is not the system of record. Production should use the existing
store for ownership and investigation indexes, and explicitly decide which
workflow inputs/outputs may be retained elsewhere. If state cannot leave at all,
use the customer's orchestrator and preserve the API contract. Admit this changes
the chosen durability primitive.

**“Cut the budget in half.”**
Measure first. Limit report size and input evidence, use a cheaper evaluated model,
restrict live generation to meaningful cases, and reuse completed reports when
freshness permits. Keep access and evidence validation. Avoid claiming the cheapest
model has equivalent accuracy without running the rubric.

**“Automatically roll back the broken service.”**
The current system is intentionally read-only. A future write path needs service
authorization, explicit human approval, idempotency, audit, compatibility checks,
and post-action verification. Model output alone must not authorize a rollback.

**“What happens if the browser closes?”**
The workflow continues. The browser stores only a run reference and capability.
Reconnect to the run to read persisted status/output. Cross-device discovery needs
an authenticated server-side index, which this demo does not implement.

**“What happens during a deployment?”**
Maintain workflow identity and serialized contract compatibility. Deployment
rollback restores code, not state. Test older run references after deployment;
do not treat persistence as a blanket guarantee that incompatible code can resume.

## Code walk-through

1. `lib/contracts.ts`: finite inputs, evidence shape, report schema, citation gate.
2. `mock/handler.ts`: separate authenticated read-only service and 503 fault injection.
3. `workflows/investigate.ts`: retrieve → synthesize → finalize.
4. `workflows/steps.ts`: retry limits, timeout, credential boundary, sample/live distinction.
5. `lib/analysis.ts`: model call, prompt policy, structured output, selected accounting fields.
6. `lib/access.ts` and `app/api`: reviewer session, scoped run access, origin checks.
7. `components/workbench.tsx`: poll/reconnect, evidence inspection, browser-local history.

## Technical details to own

- **Rendering:** The workbench and proposal shells are prerendered at build time.
  Client interactions fetch dynamic API state. Investigation/session responses
  are `no-store`; personalized results must not enter a shared cache. There is no
  ISR or Cache Components dependency, and the final validated report is not token
  streamed. Polling shows progress without displaying incomplete, unvalidated claims.
- **Model and tools:** The workflow chooses a fixed read-only retrieval operation;
  the model does not choose arbitrary tools or URLs. `maxRetries: 0` disables SDK
  retries; the inference step also has zero retries. Gateway's default routing can
  still use multiple providers of the same model. No cross-model fallback chain or
  provider outage test is configured. Never equate SDK retries with Gateway routing.
- **Compute and connectivity:** Browser → Next API → durable steps → authenticated
  HTTPS mock and Gateway. External calls spend time waiting on I/O; Fluid Compute
  supports concurrent work, but the demo has no global admission limiter. Its
  5-second telemetry timeout, two retries, fixed input, 45-second model timeout,
  output-token bound, reviewer gate, and project budget are separate controls.
  Active CPU is only one billing dimension; memory and invocations also matter.
- **Production boundary:** Replace the synthetic adapter with an approved telemetry
  integration, scoped service identity, redaction, tenant authorization, and a
  reviewed private network path where necessary. Region selection for Functions
  alone does not constrain model routing, state storage, or logs.
- **State and rollout:** A completed run was retrieved after redeployment. That
  does not prove arbitrary in-flight or incompatible workflow upgrades. Keep
  function identity/serialized contracts compatible, canary with a responder
  cohort, and test active runs before promoting. Rolling back code does not
  reverse stored results or any external operation.

References: [Gateway routing](https://vercel.com/docs/ai-gateway/models-and-providers/provider-options),
[Fluid Compute](https://vercel.com/docs/fluid-compute),
[Secure Compute](https://vercel.com/docs/networking/secure-compute).

## Small live changes to practice

- Reduce `maxOutputTokens`, rerun an evaluation, discuss brevity versus completeness.
- Change `AI_MODEL` server-side and compare the same rubric; do not expose arbitrary models to callers.
- Add a new counter-evidence item to a fixture and observe whether the hypothesis changes.
- Change the retrieval retry budget and demonstrate the outage behavior.

## Before sending

- Confirm the live inference path and reviewer code work from a fresh browser.
- Run the seven AI evaluation cases and review every claim and cited source.
- Verify the public app and repository links without a Vercel/GitHub login.
- Ensure the proposal clearly distinguishes demo, proposed production design, and pilot targets.
- Preserve the commit history and disclose development tools.
- Resolve the brief's conflicting dates with recruiting; target at least three business days early.
- Rehearse explaining every selected primitive and the decision not to move the existing estate.

No email or recruiter submission has been sent by the coding assistant.
