# Deploying Relay

Order matters: the customer's API first, then the index, then the app.

## 1. Customer API on AWS (us-east-1)

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
| `TELEMETRY_API_URL`    | the Lambda function URL                                |
| `TELEMETRY_API_TOKEN`  | the token from step 1                                  |
| `DATABASE_URL`         | from step 2                                            |
| `DEMO_ACCESS_CODE`     | the reviewer code you will put in the submission email |
| `SESSION_SECRET`       | `openssl rand -hex 32`                                 |
| `DEMO_CONTROLS`        | `true`                                                 |
| `AI_MODEL`             | `openai/gpt-5.2`                                       |
| `AI_FALLBACK_MODELS`   | `anthropic/claude-sonnet-5,google/gemini-2.5-flash`    |
| `NEXT_PUBLIC_DEMO_URL` | the production URL (for the proposal page)             |
| `NEXT_PUBLIC_REPO_URL` | the GitHub URL                                         |

AI Gateway authenticates with the project's OIDC token; no provider key is
needed. Enable AI Gateway for the team, add a card to unlock credit, and set
a monthly budget under AI Gateway → Usage & Budgets.

Preview environments: set the same variables for Preview with a different
`TELEMETRY_API_TOKEN` if the Lambda is configured with two, or the same one
for the demo.

## 4. Verify

```sh
DEMO_URL=https://<app>.vercel.app DEMO_ACCESS_CODE=<code> npm run smoke
npm run probe:fallback
npm run eval
```

Then open Observability → Workflows in the dashboard and confirm the five
smoke runs are listed with their steps.

## Plan notes

- Workflows retains run data 1 day on Hobby and 7 on Pro. The Postgres index
  is what reviewers will read days later.
- Rolling Releases need Pro. Instant Rollback works on Hobby (to the previous
  deployment).
- Trace Drains (Gateway traces into the customer's own observability tool)
  need Pro.
