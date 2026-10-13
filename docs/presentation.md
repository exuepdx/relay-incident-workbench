# Customer conversation and demo rehearsal

Use `/proposal` as the customer-facing asset. These are speaker notes, not a script
to read verbatim. Replace fictional discovery assumptions with your own language
and experience; do not imply that Northstar is a real customer you supported.

## A 12-minute flow

| Time        | Show                               | Say / establish                                                                                                                               |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:30   | Proposal opportunity               | “You already have telemetry. What slows response is turning multiple signals into an agreed next step.” Validate the pain before the product. |
| 1:30–3:00   | Boundary diagram                   | Workloads and observability stay. Vercel adds the response experience, durable execution, and model boundary.                                 |
| 3:00–6:00   | Checkout investigation             | Read the latency and trace, start a live run, open a citation, distinguish hypothesis from root cause, show the customer update.              |
| 6:00–7:30   | Counter-evidence / incomplete case | A nearby deploy is not necessarily responsible. Missing spans should cause uncertainty, not a confident story.                                |
| 7:30–9:00   | Resilience controls and saved runs | First-request 503 recovers; persistent outage returns no diagnosis. Refresh and reconnect. Explain retry and state boundaries.                |
| 9:00–10:00  | Run accounting                     | Show actual input/output tokens, model time, cost when returned, and the project budget. Explain what cost excludes.                          |
| 10:00–12:00 | Pilot and success measures         | Preview, validation, cohort rollout, expansion gates, rollback, and known limitations. Ask whether these are the right pilot outcomes.        |

If live inference is unavailable, say so explicitly and use the authored sample to
rehearse UX and workflow behavior. Do not present the sample as proof of live model
quality. Before the interview, run the live evaluation and record its results.

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

## Small live changes to practice

- Reduce `maxOutputTokens`, rerun an evaluation, discuss brevity versus completeness.
- Change `AI_MODEL` server-side and compare the same rubric; do not expose arbitrary models to callers.
- Add a new counter-evidence item to a fixture and observe whether the hypothesis changes.
- Change the retrieval retry budget and demonstrate the outage behavior.

## Before sending

- Confirm the live inference path and reviewer code work from a fresh browser.
- Run the four AI evaluation cases and review every claim and cited source.
- Verify the public app and repository links without a Vercel/GitHub login.
- Ensure the proposal clearly distinguishes demo, proposed production design, and pilot targets.
- Preserve the commit history and disclose development tools.
- Resolve the brief's conflicting dates with recruiting; target at least three business days early.
- Rehearse explaining every selected primitive and the decision not to move the existing estate.

No email or recruiter submission has been sent by the coding assistant.
