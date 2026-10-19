# Handoff notes

State as of 2026-10-18. This repo is a complete rebuild of the Relay demo for
the Vercel technical exercise. Read `README.md` first, then `docs/deploy.md`
(what still needs accounts) and `docs/demo-script.md` (the live session).
The adversarial review that motivated the rebuild is in the zip root as
`RELAY-REVIEW.md`.

## Verified

- `npm ci && npm test` → 25 tests pass
- `npm run typecheck && npm run typecheck:customer-api` → clean
- `npm run build` → clean (Cache Components; `/incidents/[id]` and
  `/incidents/[id]/compare` are partial prerenders)
- `SMOKE_PAUSE=1 npm run smoke` against the offline harness → 7 runs pass:
  healthy, abstention, transient 503 retry, provider-outage fallback with an
  approved mitigation, model override with a declined mitigation, redeploy
  hold, full outage
- In a browser: approval card pauses and resumes the run, compare page,
  dark mode, presenter mode, WebGL hero

## Run it offline (no Gateway credit needed)

```sh
npm ci
cp .env.example .env.local
# add to .env.local:
#   AI_GATEWAY_API_KEY=fake-gateway-key
#   RELAY_FAKE_GATEWAY_URL=http://127.0.0.1:4321
#   DEMO_ACCESS_CODE=local-dev-code
#   DEMO_PAUSE_SECONDS=4
#   APPROVAL_TIMEOUT=2m
npm run customer-api                 # terminal 1, port 4319
npx tsx scripts/fake-gateway.ts      # terminal 2, port 4321
npm run dev                          # terminal 3, http://127.0.0.1:3000
```

Remove `RELAY_FAKE_GATEWAY_URL` and set a real `AI_GATEWAY_API_KEY` to use
the real Gateway locally. On Vercel the Gateway uses the project's OIDC token.

## Not done (needs accounts)

In order, from `docs/deploy.md`: deploy `customer-api/` to an AWS Lambda
function URL (`deploy-lambda.sh`), create a Neon Postgres and set
`DATABASE_URL`, deploy to Vercel with the listed variables, push to a public
GitHub repo with the CI secrets, run `npm run probe:fallback` and
`npm run eval` with real credit (the proposal renders
`artifacts/evaluation.json` when it exists), add the Firewall rate-limit
rules, open a trivial PR for the preview and rollback moment.

## Things that will bite you

- Commits are authored as `Eric Xue <eric.xue@elastic.co>` (set in this
  repo's local git config). Change the author before pushing if needed.
- Do not run `next build` while `next dev` is running; it corrupts the dev
  server state. Stop dev, build, restart.
- Next.js re-patches global `fetch` on hot reloads. The offline harness
  re-asserts its redirect in `workflows/steps.ts` (`modelPhase`) for that
  reason; keep that line if you touch the step.
- Workflow steps cannot receive a Gateway model _instance_ (its auth headers
  are async and will not serialize). Always pass a model slug.
- CSS keyframes that end on a `transform` with `animation-fill-mode: both`
  override an element's own transform; positioned elements use
  `backwards` (see `.node` in `app/globals.css`).
- In production, `customerGet` refuses a plain-HTTP telemetry URL by design.
  Local `http://127.0.0.1` is only allowed when `NODE_ENV !== production`.
- Workflows retains run data for 1 day on Hobby; the Postgres index is what
  reviewers will read days later.

## Map

| Path                                                              | What                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `workflows/investigate.ts`, `workflows/steps.ts`                  | the durable run, tools as steps, the approval hook, the redeploy hold             |
| `lib/agent.ts`, `lib/tools.ts`, `lib/gateway.ts`, `lib/config.ts` | instructions, tool boundary, Gateway routing and accounting, every live-demo knob |
| `lib/contracts.ts`                                                | every schema that crosses a boundary, plus report validation                      |
| `app/api/investigations/**`                                       | start, status, list, NDJSON progress stream, approval                             |
| `app/incidents/[id]/**`                                           | the workbench and the compare page                                                |
| `app/proposal/page.tsx`                                           | the eight-section customer artifact with presenter mode                           |
| `components/hero-scene.tsx`                                       | the WebGL hero (react-three-fiber)                                                |
| `customer-api/`                                                   | the customer's telemetry API: handler, Lambda and Vercel adapters, deploy script  |
| `scripts/`                                                        | eval, smoke, fallback probe, fake Gateway                                         |
| `.github/workflows/`                                              | CI, eval job, preview smoke gate                                                  |
| `artifacts/`                                                      | iteration-1 eval artifacts and smoke results                                      |
