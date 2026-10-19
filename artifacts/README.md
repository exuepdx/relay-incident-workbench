# Evaluation and deployment artifacts

- `evaluation.json`: latest eight-case live primary-model suite. Read the recorded prompt hash, failures and each output; an automated pass is not human approval.
- `evaluation-primary-semantic-review.json`: an intermediate automated pass where source review found an invented HTTP observation. Retained to explain the additional runtime guard.
- `evaluation-*-second-pass.json`, `evaluation-repair-*.json`, `evaluation-incomplete-repair.json`: earlier attempts, including model errors and request-rate limits. These are historical, not current qualification.
- `evaluation-gemini-repair.json`: candidate-model evaluation. Its quality failure is why normal runs do not automatically fall back to it.
- `fallback-verification.json`: live Gateway routing metadata from an explicit provider-outage probe. Routing success is distinct from report quality.
- `telemetry-deployment-verification.json`: authenticated and unauthenticated HTTP checks against the independently deployed mock API.
- `postgres-verification.json`: created only after the real hosted integration check passes.
- `deployment-smoke.json`: created only by a completed hosted workflow smoke run for this implementation.
- `local-*`: ignored local verification data, screenshots and backups. Offline costs/models are simulated.
- `v1-*`: historical original-implementation evaluations; not evidence for the rebuilt tool-loop agent.

Known structural and semantic regressions are checked automatically. Source-by-source human review is still a separate release gate. Failed attempts are retained rather than rewritten as successes.
