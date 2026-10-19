# Relay technical exercise — handoff

Start with `README.md` for the demo and setup, `docs/decisions.md` for architecture choices, and `docs/demo-script.md` for the walkthrough. This workspace contains the imported Fable rebuild plus the documented repairs. The review in `docs/review-2026-10-18.md` describes the imported revision; `docs/repair-verification.md` records the fixes and later visual and copy changes.

## The presentation

Lead with INC-0244: an enterprise retail bridge needs to agree on the affected dependency and next owner. Show the trace, path evidence, ownership view, then the generated report and its source dialogs. Follow with a transient retry and the incomplete-evidence case. Use `/proposal?present=1` for the six-screen narrative. Keep comparison, approval, and routing details for questions.

The customer is fictional. Its EKS/RDS/observability/Jenkins stack is a scenario assumption. The actual synthetic telemetry API runs in a separate Vercel project; no AWS deployment is claimed. Business outcomes are proposed pilot targets, not measured customer results.

## Deployment status

The workbench is live at `https://relay-incident-workbench.vercel.app`; its six-screen presentation is at `/proposal?present=1`. The telemetry service is deployed separately at `https://relay-telemetry-mock.vercel.app`. Free Neon Postgres is connected to Production and Preview and passed the hosted integration checks. Seven hosted workflow scenarios passed with real Gateway calls. A production workflow completed across promotion, and its retained report remained unchanged after rollback and restoration.

The owner approved a $2 total, non-renewing AI Gateway project cap. All eight primary evaluation cases passed under the final prompt/contract version. Four were resumed after the original budget blocked them; batch provenance and the blocked attempt are retained. No credits were purchased.

Preserve the existing reviewer access code, session secret and telemetry token in the ignored `.env.deploy` file. `TELEMETRY_API_URL` uses the telemetry service's **base URL**, without `/api/telemetry`. Settings: `DEMO_CONTROLS=true`, primary `openai/gpt-5.2`, empty `AI_FALLBACK_MODELS`, and comparison candidate `google/gemini-2.5-flash`. The authorized preview test credential lives only in ignored local configuration; do not publish it.

For future changes, deploy a preview, verify real runs and saved approvals, then promote. The current release's hosted smoke, production continuity and rollback evidence are in `artifacts/deployment-smoke.json`, `artifacts/deployment-continuity.json` and `artifacts/deployment-rollback.json`. These checks used the real hosted services. The preview automation credential stays in ignored local configuration; GitHub's automated preview gate is not configured.

## Important decisions

- A report and any proposal are validated against the actual tool transcript **before** an approval is displayed. Source dialogs retain the exact run evidence, including on Compare.
- HTTP observations may not be invented or generalized from one response into a frequency. Deterministic checks cover known regressions; they do not prove all prose true.
- Automatic cross-model fallback is off. The candidate failed a live report-quality check. Explicit comparison/outage drills remain available to demonstrate routing separately from quality qualification.
- Hosted runs require Postgres. File storage is for one local developer process. Idempotency keys prevent lost-response retries from creating a second paid run; an unconfirmed reservation is deliberately not automatically redispatched.
- The store factory imports Postgres directly. Side-effect adapter registration worked locally but failed in the hosted workflow bundle; the explicit dependency is deliberate.
- The approval is a demo reviewer decision, not verified owner identity. Nothing executes against operational systems.
- Existing workflows remain pinned to the deployment that started them. Do not claim a held run migrates onto new code.

## Local verification and replay

Use Node 22. Run `npm test`, both typechecks and `npm run build`. Stop the development server for the final build so generated route and Workflow files remain stable during verification. The offline fake Gateway is disabled in production and proves orchestration only. Its reported prices/models are simulated.

Use `node --env-file=<ignored-env-file> --import tsx scripts/evaluate.ts --delay-ms=65000` for live evaluations. The delay avoids the account's per-model request limit. Each artifact records prompt/evidence hashes and separates human review from automated checks. Keep failed attempts; never overwrite them to imply a first-pass success.

The original and imported histories are preserved in Git and in ignored local backup bundles. Do not overwrite the worktree with the archive again. Never upload `.env*`, `.vercel`, `.workflow-data`, `.data`, `artifacts/local-*`, `output`, or `tmp`.
