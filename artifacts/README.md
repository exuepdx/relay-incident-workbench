# Evaluation and deployment artifacts

- `evaluation.json`: eight passing live primary-model cases under the same prompt and report contract. The artifact records batch provenance: four original core results plus four resumed adversarial cases. An automated pass is not human approval.
- `evaluation-primary-budget-blocked.json`: the preserved attempt that hit the original project budget after four passes. `evaluation-network-*-final.json` retains the resumed cases individually.
- `evaluation-primary-semantic-review.json`: an intermediate automated pass where source review found an invented HTTP observation. Retained to explain the additional runtime guard.
- `evaluation-primary-format-review.json`: an intermediate automated pass where source review found schema metadata in next-action prose. Retained to explain the sentence constraints.
- `evaluation-*-second-pass.json`, `evaluation-repair-*.json`, `evaluation-incomplete-repair.json`: earlier attempts, including model errors and request-rate limits. These are historical, not current qualification.
- `evaluation-gemini-repair.json`: candidate-model evaluation. Its quality failure is why normal runs do not automatically fall back to it.
- `fallback-verification.json`: live Gateway routing metadata from an explicit provider-outage probe. Routing success is distinct from report quality.
- `telemetry-deployment-verification.json`: authenticated and unauthenticated HTTP checks against the independently deployed mock API.
- `postgres-verification.json`: created only after the real hosted integration check passes.
- `hosted-workflow-first-attempt.json`: the production-only adapter registration failure found before promotion, and its repair.
- `deployment-smoke.json`: seven passing hosted workflow scenarios using real Gateway calls and Postgres.
- `deployment-continuity.json`: a real production workflow started before promotion and completed after promotion; its original deployment continued executing it.
- `deployment-rollback.json`: the same completed report and evidence hash remained readable after rollback, before restoring the newer deployment.
- `release-verification.json`: final public deployment, route checks, retained report hash and budget snapshot.
- `local-*`: ignored local verification data, screenshots and backups. Offline costs/models are simulated.
- `v1-*`: historical original-implementation evaluations; not evidence for the rebuilt tool-loop agent.

Known structural and semantic regressions are checked automatically. Source-by-source human review is still a separate release gate. Failed attempts are retained rather than rewritten as successes.
