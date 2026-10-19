# Relay

An incident investigation agent for Northstar Commerce, a fictional enterprise
retailer on AWS. Relay runs on Vercel, reads the telemetry the customer already
has through a read-only API, calls three tools as durable workflow steps, and
returns a cited report with the next check and a draft customer update.
Approval records a reviewer decision; the demo has no integration that executes changes.

- **Customer presentation:** [six-screen presenter view](https://relay-incident-workbench.vercel.app/proposal?present=1)
- **Live workbench:** [cascading network incident](https://relay-incident-workbench.vercel.app/incidents/INC-0244)
- **Demo script and curveball prep:** [docs/demo-script.md](docs/demo-script.md)
- **Deploying:** [docs/deploy.md](docs/deploy.md)
- **Verification record:** [docs/repair-verification.md](docs/repair-verification.md)

## Architecture in one paragraph

Next.js 16 with Cache Components renders a static shell, caches each incident
as a tagged segment, and streams the live run. A Vercel Workflow briefs a
`WorkflowAgent` (AI SDK) from the customer's telemetry API, runs its three
read-only tools as retried steps, validates the report and any proposal against the exact retrieved evidence,
then pauses on a workflow hook for a demo reviewer decision if appropriate, and persists to
a Postgres index. AI Gateway is
the model boundary: provider routing and per-run accounting. Automatic cross-model
fallback is disabled until a candidate passes the report-quality gate; explicit
comparison and outage drills can still exercise candidate routing. The customer's API is a separately deployed synthetic service, with Lambda and
Vercel adapters. Its actual deployment is recorded in the verification notes.

## Run locally

Node 22. Three processes: the customer API, the app, and (optionally) a fake
Gateway so everything works without model credit.

```sh
npm ci
cp .env.example .env.local        # defaults point at the local customer API
npm run customer-api              # terminal 1, port 4319
npm run dev -- --webpack           # terminal 2, http://127.0.0.1:3000
```

Live model calls locally need `AI_GATEWAY_API_KEY` in `.env.local`. To run
fully offline instead, add `RELAY_FAKE_GATEWAY_URL=http://127.0.0.1:4321`
and `AI_GATEWAY_API_KEY=fake` to `.env.local` and start the fake Gateway:

```sh
npx tsx scripts/fake-gateway.ts   # terminal 3, port 4321
```

The reviewer code defaults to whatever `DEMO_ACCESS_CODE` is in `.env.local`.

## Validate

```sh
npm test                 # contracts, access, provenance, approvals, persistence and evaluations
npm run typecheck && npm run typecheck:customer-api
npm run build
DEMO_ACCESS_CODE=... npm run smoke    # 6 end-to-end runs: 503 retry, fallback, approval, model override, outage
SMOKE_PAUSE=1 DEMO_ACCESS_CODE=... npm run smoke       # also the redeploy hold
npm run eval -- --delay-ms=65000  # 8 agent cases through AI Gateway (uses real credit)
npm run probe:fallback   # verifies the provider-outage drill before a live demo
```

## Layout

| Path                                             | What                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `app/incidents/[id]`                             | the workbench route: static shell, cached incident segment, streamed run         |
| `app/api/investigations`                         | start, status, list, and the NDJSON progress stream                              |
| `workflows/`                                     | the durable investigation and its steps                                          |
| `lib/agent.ts`, `lib/tools.ts`, `lib/gateway.ts` | instructions, tool boundary, Gateway routing and accounting                      |
| `lib/contracts.ts`                               | every schema that crosses a boundary, plus report validation                     |
| `lib/store.ts`, `lib/store-postgres.ts`          | the investigation index                                                          |
| `lib/config.ts`                                  | every knob a live change might touch                                             |
| `customer-api/`                                  | the customer's telemetry API: handler, Lambda and Vercel adapters, deploy script |
| `scripts/`                                       | eval, smoke, fallback probe, fake Gateway                                        |
| `artifacts/`                                     | evaluation and smoke results with hashes                                         |

## Trust and persistence boundaries

`lib/run-validation.ts` replays the successful tool results, requires all three
reads, and validates report/proposal citations before any approval is offered.
Reports and approval cards retain that exact snapshot. The model briefing does
not contain chart measurements or curated handoff answers.

Production requires `DATABASE_URL`; there is no process-local memory fallback.
Starts reserve an idempotency key before dispatch, and the workflow creates its
index record before inference. An ambiguous dispatch is not automatically
repeated; inspect saved runs before creating a new request. Local file storage
is for one developer process, not concurrent deployment instances.

The proposal's six-screen presenter mode is the main story. Detailed limitations,
alternatives, tooling disclosure and validation remain in its appendix.
