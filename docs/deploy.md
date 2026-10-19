# Deploying Relay

Order matters: the customer's API first, then the index, then the app.

## 1. Separate customer telemetry service

AWS Lambda is optional. A separate Vercel project is a realistic synthetic boundary
for this demo and uses the included `customer-api/api` adapter.

### AWS option (us-east-1)

```sh
cd customer-api
npm install
TELEMETRY_API_TOKEN=$(openssl rand -hex 24) ./deploy-lambda.sh
```

The script prints `TELEMETRY_API_URL`. Verify:

```sh
curl -s -H "Authorization: Bearer $TELEMETRY_API_TOKEN" "$TELEMETRY_API_URL/incidents"
```

Fallback if AWS is unavailable: `vercel deploy --prod` from `customer-api/`
with `TELEMETRY_API_TOKEN` set as an environment variable.

## 2. Postgres index

Create a Neon database from the Vercel Marketplace (or use any Postgres) and
copy its connection string as `DATABASE_URL`. The table is created on first use.

## 3. The app on Vercel

Import the repository, framework Next.js, region `iad1` (from `vercel.json`).
Environment variables:

| Variable               | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| `TELEMETRY_API_URL`    | the independently deployed telemetry service URL       |
| `TELEMETRY_API_TOKEN`  | the token from step 1                                  |
| `DATABASE_URL`         | from step 2                                            |
| `DEMO_ACCESS_CODE`     | the reviewer code you will put in the submission email |
| `SESSION_SECRET`       | `openssl rand -hex 32`                                 |
| `DEMO_CONTROLS`        | `true`                                                 |
| `AI_MODEL`             | `openai/gpt-5.2`                                       |
| `AI_FALLBACK_MODELS`   | empty until the candidate passes the quality gate      |
| `NEXT_PUBLIC_DEMO_URL` | the production URL (for the proposal page)             |
| `NEXT_PUBLIC_REPO_URL` | the GitHub URL                                         |

The comparison model is an evaluation candidate. The explicit provider-outage drill may test it; ordinary runs do not automatically fall back to it.

AI Gateway authenticates with the project's OIDC token; no provider key is
needed. Enable AI Gateway for the team, add a card to unlock credit, and set
a monthly budget under AI Gateway → Usage & Budgets.

Preview environments: set the same variables for Preview with a different
`TELEMETRY_API_TOKEN` if the Lambda is configured with two, or the same one
for the demo.

## 4. Protect the start endpoint

In the project's Firewall tab add a rate-limit rule: path `/api/investigations`,
method `POST`, 10 requests per minute per IP, action `deny`. Add a second rule
for `/api/session` at 5 per minute. Turn on Bot Protection. The reviewer code
gates who can start a run; these rules bound how fast.

## 5. CI and the promotion gate

GitHub Actions in `.github/workflows/`:

- `ci.yml` runs tests, typechecks, and the production build on every push and
  pull request. Label a PR `eval` (or run the workflow manually) to run the
  eight-case agent evaluation; it needs the `AI_GATEWAY_API_KEY` secret and
  uses real Gateway credit.
- `preview-smoke.yml` listens for Vercel's deployment events and runs the
  end-to-end smoke against each Preview URL, so the check on the PR is the
  gate before promotion. Secrets: `DEMO_ACCESS_CODE` and, if Deployment
  Protection is on, `VERCEL_AUTOMATION_BYPASS_SECRET` from the project's
  Deployment Protection settings.

## 6. Observability

`instrumentation.ts` registers `@vercel/otel`; the AI SDK emits spans for
every model and tool call under `relay.investigate`. On Pro, add an OTLP
trace drain (Team Settings → Drains) to forward both application traces and
AI Gateway traces to the customer's observability platform.

## 7. Verify

```sh
DEMO_URL=https://<app>.vercel.app DEMO_ACCESS_CODE=<code> npm run smoke
npm run probe:fallback
npm run eval
```

Then open Observability → Workflows in the dashboard and confirm the smoke runs are listed with their steps.

## Plan notes

- Workflows retains run data 1 day on Hobby and 7 on Pro. The Postgres index
  is what reviewers will read days later.
- Rolling Releases need Pro. Instant Rollback works on Hobby (to the previous
  deployment).
- Trace Drains (Gateway traces into the customer's own observability tool)
  need Pro.
