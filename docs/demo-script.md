# Relay: twelve-minute customer demonstration

Use `/proposal?present=1`: six visual screens, arrows or visible controls to move,
Notes to open the reference section, and Escape to leave presentation mode.
Motion can be paused from the navigation bar. Diagrams illustrate the design;
they do not run the agent or consume model credits.
The fictional stack illustrates an authentic enterprise incident pattern. Do not
present invented timings or ROI as facts about the original customer.

| Time        | Show                    | Explain                                                                                                                                                                                                            |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–1:00   | Problem                 | Multiple teams join a retail outage bridge with different telemetry. The delay is agreeing on the affected dependency and next owner.                                                                              |
| 1:00–2:30   | Architecture            | Connect the existing observability API; retain services and operational authority. Show evidence, prompts and state crossing into Vercel and the model.                                                            |
| 2:30–6:00   | INC-0244                | Inspect trace E2 and flow evidence E3. Explain the curated map, Network Platform / Inventory Services handoff, and what would challenge the hypothesis. Run the agent and open a citation from its saved snapshot. |
| 6:00–8:00   | One resilience drill    | Inject a transient telemetry 503, observe the retry, and refresh. Show the same run reconnecting. Keep provider fallback and approval for questions unless separately rehearsed.                                   |
| 8:00–9:00   | INC-0243                | Missing evidence means gathering measurements, not proposing an operational experiment. Explain code validation and its semantic limits.                                                                           |
| 9:00–10:30  | Accounting and measures | Use a real run's cost and duration. Exclude human waiting when discussing inference latency. Coordination improvement is a proposed pilot target.                                                                  |
| 10:30–12:00 | Rollout and discovery   | One rotation, evidence review, spend gate, cutover, rollback. Ask which business measure would justify expansion.                                                                                                  |

## Visual walkthrough

1. **Overview:** introduce the retail outage and the coordination problem.
2. **The incident:** select Trace evidence to highlight the 2,450 ms connection
   wait, then Next owner. The dependency diagram does not prove a device-level cause.
3. **Architecture:** switch from Hosted demo to Proposed customer pilot. Click
   Workflows or AI Gateway to reveal one product decision at a time. Explain
   selected evidence crossing the boundary and Workflow state remaining on Vercel.
4. **Investigation:** step through Read → Draft → Validate → Review → Save.
   Use Missing evidence to demonstrate abstention, then open the real workbench.
   Play sequence is optional; manual steps work with motion disabled.
5. **Pilot targets:** distinguish proposed improvements from recorded test results.
6. **Rollout:** select Cutover and Rollback. New-request routing changes while
   existing workflows retain their starting deployment and saved reports remain.

Each screen has collapsed Discussion notes for technical detail. The Notes view
includes trade-offs, production gaps, model evaluations, development tools and
product feedback. Use those for questions rather than reading them aloud.

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
