# Relay technical exercise — handoff

This workspace contains the imported Fable rebuild plus repairs from the adversarial review. Start with `README.md`, `docs/demo-script.md`, and `docs/repair-verification.md`. The original review in `docs/review-2026-10-18.md` describes the imported revision, not the repaired state.

## The presentation

Lead with INC-0244: an enterprise retail bridge needs to agree on the affected dependency and next owner. Show the trace, path evidence, ownership view, then the generated report and its source dialogs. Follow with a transient retry and the incomplete-evidence case. Use `/proposal?present=1` for the six-screen narrative. Keep comparison, approval, and routing details for questions.

The customer is fictional. Its EKS/RDS/observability/Jenkins stack is a scenario assumption. The actual synthetic telemetry API runs in a separate Vercel project; no AWS deployment is claimed. Business outcomes are proposed pilot targets, not measured customer results.

## Current deployment constraint

The telemetry service is deployed at `https://relay-telemetry-mock.vercel.app`. The rebuilt main app must not replace production until its Postgres connection is configured and tested. Vercel currently requires the account owner to accept Neon's marketplace terms before the free database can be provisioned. The existing main public URL still serves the preceding revision.

The $1 AI Gateway project cap is also exhausted. The final primary attempt passed the four core cases; four adversarial cases were budget-blocked. Do not increase the cap without the owner's approval. The requested increase to $2 total is pending; no credits were purchased.

After acceptance, create/connect the free Neon resource to Production and Preview, pull its environment into an ignored file, and run `scripts/check-postgres.ts`. Preserve the existing reviewer access code, session secret and telemetry token in the ignored `.env.deploy` file. Set `TELEMETRY_API_URL` to the telemetry service's **base URL**, without `/api/telemetry`. Configure `DEMO_CONTROLS=true`, primary `openai/gpt-5.2`, empty `AI_FALLBACK_MODELS`, and comparison candidate `google/gemini-2.5-flash`. Add the verified public demo/repository URLs.

Deploy a preview, verify real runs and saved approvals, then promote. Reopen a completed report from a fresh browser context and rehearse rollback/redeployment continuity. Do not mark those checks complete based on local simulation.

## Important decisions

- A report and any proposal are validated against the actual tool transcript **before** an approval is displayed. Source dialogs retain the exact run evidence, including on Compare.
- HTTP observations may not be invented or generalized from one response into a frequency. Deterministic checks cover known regressions; they do not prove all prose true.
- Automatic cross-model fallback is off. The candidate failed a live report-quality check. Explicit comparison/outage drills remain available to demonstrate routing separately from quality qualification.
- Hosted runs require Postgres. File storage is for one local developer process. Idempotency keys prevent lost-response retries from creating a second paid run; an unconfirmed reservation is deliberately not automatically redispatched.
- The approval is a demo reviewer decision, not verified owner identity. Nothing executes against operational systems.
- Existing workflows remain pinned to the deployment that started them. Do not claim a held run migrates onto new code.

## Local verification and replay

Use Node 22. Run `npm test`, both typechecks and `npm run build`. Stop the development server for the final build so generated route and Workflow files remain stable during verification. The offline fake Gateway is disabled in production and proves orchestration only. Its reported prices/models are simulated.

Use `node --env-file=<ignored-env-file> --import tsx scripts/evaluate.ts --delay-ms=65000` for live evaluations. The delay avoids the account's per-model request limit. Each artifact records prompt/evidence hashes and separates human review from automated checks. Keep failed attempts; never overwrite them to imply a first-pass success.

The original and imported histories are preserved in Git and in ignored local backup bundles. Do not overwrite the worktree with the archive again. Never upload `.env*`, `.vercel`, `.workflow-data`, `.data`, `artifacts/local-*`, `output`, or `tmp`.
