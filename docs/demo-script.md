# Relay: twelve-minute customer demonstration

Use `/proposal?present=1`: nine visual screens, arrows or visible controls to move,
Notes to open the reference section, and Escape to leave presentation mode.
Motion can be paused from the navigation bar. Diagrams illustrate the design;
they do not run the agent or consume model credits.
The fictional stack illustrates an authentic enterprise incident pattern. Do not
present invented timings or ROI as facts about the original customer.

| Time        | Show                 | Explain                                                                                                                                                              |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:50   | Customer problem     | Northstar is fictional; the enterprise coordination problem is familiar. Name the scenario stack, degraded checkout and responder-time cost.                         |
| 0:50–2:00   | Architecture         | Switch Current state → Target pilot → Hosted demo. Name the four primitives and one trade-off; explain what stays and why.                                           |
| 2:00–2:45   | Design decision      | Replay Duplicate starts and name its accepted cost. Keep the other two decisions available for questions.                                                            |
| 2:45–6:00   | Live investigation   | Inspect E2/E3, run INC-0244, open a saved citation and refresh the same run. Use one rehearsed retry drill if time permits.                                          |
| 6:00–7:00   | Incomplete evidence  | Open the retained INC-0243 result. Show missing measurements and withheld diagnosis; explain the validation limits.                                                  |
| 7:00–8:00   | Success measures     | Responder-minutes, report quality, analysis p95 and model cost. Distinguish proposed targets from recorded demo checks.                                              |
| 8:00–9:00   | Before kickoff       | Name the four visible limitations. Select the customer's highest concern and explain the required decision and owner.                                                |
| 9:00–10:30  | Rollout              | Preview → validate → one rotation → cutover → rollback. Show retained state and the rehearsed deployment record.                                                     |
| 10:30–12:00 | Build and validation | Codex desktop and Fable assisted implementation. Explain the eight-case live test set, regressions, hosted checks and the failed candidate that changed the release. |

## Visual walkthrough

1. **Overview:** introduce the retail outage and the coordination problem.
2. **The incident:** select Trace evidence to highlight the 2,450 ms connection
   wait, then Next owner. The dependency diagram does not prove a device-level cause.
3. **Architecture:** begin with Current state: EKS, RDS, Jenkins and observability
   feed a manual outage call. Target pilot adds a shared investigation while
   retaining transaction authority, release controls and telemetry retention.
   Name the four clickable Vercel primitives and their jobs.
   Explain the actual HTTP boundary: server-held bearer token, read-only API,
   schema-checked results. The realistic mock is a separate Vercel deployment,
   not an AWS deployment. Neon is Relay's external report store, not the customer's
   existing transaction database. Hosted demo shows what is actually deployed.
   Selected evidence crosses into Vercel
   and the model provider; Workflow state remains on Vercel.
4. **Design decisions:** replay Duplicate starts: two requests with the same key,
   one reservation, one investigation. Explain that an unresolved start stays
   pending rather than risking another paid run. Select Evidence before approval:
   missing coverage means collecting measurements, not approving a mitigation.
   Select Model fallback: the alternate route worked but the report failed quality
   checks, so automatic fallback is off. Name the availability cost. The diagrams
   illustrate guards; linked artifacts are the actual verification evidence.
5. **Investigation:** step through Read → Draft → Validate → Review → Save.
   Use Missing evidence to demonstrate abstention, then open the real workbench.
   Play sequence is optional; manual steps work with motion disabled.
6. **Pilot targets:** distinguish proposed improvements from recorded test results.
7. **Before kickoff:** show identity, data boundary, evidence quality and operational
   scope. Each limitation has a required decision and customer owner. These are
   proposed gates, not completed production approvals.
8. **Rollout:** select Cutover and Rollback. New-request routing changes while
   existing workflows retain their starting deployment and saved reports remain.
9. **Build and validation:** show the engineering sequence: frame, implement,
   challenge and release. Name Codex desktop, Fable, GitHub CI and Vercel CLI.
   Select live model cases to explain the rubric: supporting evidence, appropriate
   uncertainty and safe next checks. The failed comparison candidate explains
   why automatic fallback remains disabled.

Each screen has collapsed Discussion notes for technical detail. The Notes view
includes trade-offs, production gaps, model evaluations, development tools and
product feedback. Use those for questions rather than reading them aloud.

## Presentation coverage

| Customer-facing point                               | Main visual                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| Customer, current stack, pain, business consequence | Overview and incident dependency path                                      |
| Current / target state, what stays and why          | Three-state architecture diagram                                           |
| Vercel primitives, rationale and trade-offs         | Four selectable layers and the decision walkthrough                        |
| Preview, validation, canary, cutover, rollback      | Five-stage rollout with deployments A / B and retained reports             |
| Business and technical outcomes                     | Responder-minute bars, quality sample, p95 and cost targets                |
| Limitations and kickoff risks                       | Four selectable readiness gates with an owner and action                   |
| Development tools and AI validation                 | Engineering sequence, tool attribution, tests / live cases / hosted checks |

## Describing the build

Keep the story on the problem, design decisions and evidence. A concise opening:
“I used my enterprise observability experience to frame the coordination problem.
I developed Relay with Codex and Fable, keeping the investigation read-only and
the customer systems in place. The implementation was checked with regression
tests, a small live model test set and hosted failure scenarios. One candidate
model failed the report checks, so automatic fallback stayed off.”

Codex desktop was the implementation and repair workspace; Fable contributed a
substantial rebuild. Explain the code and trade-offs when asked, with the real
history available. Use the preserved history when explaining an implementation choice.

## Before presenting

- Open the production URL in a fresh browser; verify the separately shared code.
- Retain a real completed cascade and abstention run as presentation backups.
- Verify that reports survive refresh and reopening from another session.
- Read the current evaluation artifact, including failed cases and limitations.
- Rehearse the transient failure once. Do not describe offline fake costs as spend.
- Use the architecture appendix for approval, comparison, routing and rendering.
- Check the actual preview and rollback record before claiming a deployment drill passed.

## Questions to defend

**Nothing may leave us-east-1.** A provider allow-list is not a region guarantee.
Inventory the API payload, cache, Workflow state, logs, index, Gateway and model
processing. If the constraint cannot be met, change the architecture. Direct
Bedrock might be part of that change; it does not fix the other data flows.

**The sessions store cannot move.** The report index can connect to customer
Postgres. Workflow execution state is a separate store on Vercel. Do not claim
that pointing DATABASE_URL at RDS moves Workflow state with it.

**The budget was halved.** Compare evaluated models using actual quality and
cost, lower output and retry budgets deliberately, and rerun evaluations.
Catalog caching does not eliminate fresh model tool calls. Keep validation.

**Automatically roll it back.** This demo records a decision and executes
nothing. Production execution requires verified owner identity, scoped action
permissions, idempotent execution, audit, rollback and a separately tested
integration. It is a new risk boundary, not just another tool callback.

**Why an agent instead of fixed retrieval?** The agent selects read order and
whether to propose a mitigation. All three reads are mandatory, so deterministic
retrieval plus synthesis is a credible simpler alternative. Keep the agent only
if its conditional tool behavior justifies the extra model step and cost.

**Change something live.** Prefer a small defensible change: adjust a retry
budget, remove a comparison model, or add a counter-evidence case and run its
test. Explain expected behavior before editing. Do not add a new tool merely to
show coding speed.
