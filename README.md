# Relay

An incident investigation agent for Northstar Commerce, a fictional enterprise
retailer on AWS. Relay runs on Vercel, reads the telemetry the customer already
has through a read-only API, calls three tools as durable workflow steps, and
returns a cited report with the next check and a draft customer update.
Nothing it does changes a production system. People decide.

- **Proposal (the customer-ready artifact):** `/proposal`
- **Workbench:** `/incidents/INC-0244`
- **Demo script and curveball prep:** [docs/demo-script.md](docs/demo-script.md)
- **Deploying:** [docs/deploy.md](docs/deploy.md)

## Architecture in one paragraph

Next.js 16 with Cache Components renders a static shell, caches each incident
as a tagged segment, and streams the live run. A Vercel Workflow briefs a
`WorkflowAgent` (AI SDK) from the customer's telemetry API, runs its three
read-only tools as retried steps, validates the structured report against the
evidence it actually read, and persists it to a Postgres index. AI Gateway is
the only model boundary: ordered model fallbacks, provider allow-lists, and
cost per run. The customer's API lives on an AWS Lambda function URL in
us-east-1 (the "what stays" side of the boundary).

## Run locally

Node 22. Three processes: the customer API, the app, and (optionally) a fake
Gateway so everything works without model credit.

```sh
npm ci
cp .env.example .env.local        # defaults point at the local customer API
npm run customer-api              # terminal 1, port 4319
npm run dev                       # terminal 2, http://127.0.0.1:3000
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
npm test                 # 20 unit tests: contracts, access, customer API, tools, accounting, evals
npm run typecheck && npm run typecheck:customer-api
npm run build
DEMO_ACCESS_CODE=... npm run smoke    # 5 end-to-end runs incl. 503 retry, provider-outage drill, outage
npm run eval             # 7 agent cases through AI Gateway (needs credit, ~$0.10)
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
