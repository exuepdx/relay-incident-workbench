# Demo script

Twelve minutes of presentation, then the deep dive. Rehearse with the
offline harness; run the real thing once with Gateway credit before the
session and keep that run id in the saved list.

## Before the session

- [ ] `npm run probe:fallback` passes (the provider-outage drill falls back).
- [ ] `npm run eval` has produced `artifacts/evaluation.json`; the proposal renders it.
- [ ] One completed live run exists for each of the four incidents (saved investigations).
- [ ] Reviewer code works from a fresh browser. Gateway budget is set.
- [ ] Vercel dashboard tabs open: Observability → Workflows, AI Gateway → Generations, Deployments.
- [ ] A trivial PR is open with a Preview URL, ready to merge for the rollback moment.

## The twelve minutes

| Time        | Show                               | Say                                                                                                                                                                                                                               |
| ----------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:00   | One slide, or the proposal hero    | A sev-1 pulls five teams onto a bridge. The first twenty minutes go to assembling evidence by hand. The tooling team's helper on Lambda timed out at 29 seconds, retried by hand, had one provider, and no cost line.             |
| 1:00–2:30   | `/proposal#architecture`           | What stays: the telemetry API, EKS and RDS, the Postgres index, identity, Bedrock as a provider. What Vercel adds: the app, a durable agent, one model boundary. The boundary is one read-only HTTPS call with a scoped token.    |
| 2:30–6:00   | `/incidents/INC-0244`, Run         | Watch the steps: incident record, three tool calls, model phase, validation. Each is a durable step. Click a citation. Open "Blast radius & owners", copy a handoff.                                                              |
| 6:00–8:00   | Test resilience                    | "Telemetry API returns 503 once": the tool step retries, the model never sees an error. "Primary model unavailable": Gateway falls back; open Run accounting and read the model attempts. Refresh the page mid-run: it continues. |
| 8:00–9:30   | Run accounting, then the dashboard | Served model, tokens, dollars. Observability → Workflows: the trace of this run. AI Gateway → Generations: the same call with cost.                                                                                               |
| 9:30–11:00  | Deployments                        | Preview URL on the open PR. Merge, then Instant Rollback. The earlier run is still readable. Rolling Releases on Pro: 10 percent with Skew Protection.                                                                            |
| 11:00–12:00 | `/proposal#measures`               | Three gates. "Which of these is the right first metric for your rotation?"                                                                                                                                                        |

## Curveballs

**"Security says nothing leaves us-east-1."**
Functions run in iad1 (`vercel.json`). Workflows pins the run's state and
queue to the region of the function that started it; `start()` is called
with `region: "iad1"` so it is explicit. Set `AI_PROVIDER_ONLY=bedrock` and
the model never leaves AWS; Gateway's provider filter enforces it and the
run accounting shows the provider. Be honest: the Gateway hop itself is a
Vercel service. If even that is disallowed, swap the AI SDK provider to
direct Bedrock inside Secure Compute and move the fallback list into the
application. One file: `lib/gateway.ts`.

**"The sessions store can't move."**
It already lives in Postgres (`lib/store-postgres.ts`), which in production
is their RDS. Workflow run state is on Vercel by default and retained per
plan; the Workflow SDK also supports a Postgres "World" for run state in
their database. Say that this exists and that you would test it before
promising it.

**"Budget was halved. What goes first?"**
Three dials in `lib/config.ts`: make the cheaper evaluated model primary
(iteration-1 data: Gemini 2.5 Flash at about a third of the cost), lower
`maxOutputTokens`, and lengthen the incident segment's `cacheLife`. Then set
the Gateway monthly hard limit. Rerun the eval before claiming equivalence.
Keep the citation validation; it is free.

**"Make it roll the service back automatically."**
Relay is read-only by design and every next step says who approves. A write
tool would be a workflow hook: the run pauses, a human approves in the
customer's system, the run resumes. Show `createHook` in the Workflow SDK
docs rather than promising it in the demo.

**"Why not Eve?"**
Eve is Vercel's filesystem-first agent framework on the same Workflows and
Gateway. Relay is one bounded task with three tools and a fixed output, so
`WorkflowAgent` gives the durability without the surface area. A multi-turn
responder chat with channels and approvals is where Eve would be the next
step.

**"Change the model live."**
Edit `AI_MODEL` in project settings, redeploy, run. Or for the room: change
the default in `lib/config.ts`, push, Preview URL in under two minutes.

## Live change rehearsal

1. Add a fourth tool (`getDeploymentEvents`) in `lib/tools.ts` and a step in `workflows/steps.ts`.
2. Change the retry budget (`telemetryRetries`) and show the outage drill failing faster.
3. Add a counter-evidence item to `customer-api/data/incidents.json` and watch the report change.
4. Switch `AI_PROVIDER_ONLY` and show the provider in run accounting.
