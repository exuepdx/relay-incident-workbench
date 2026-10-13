# Verification record

Recorded during development on October 13, 2026. This file distinguishes completed
verification from pending work.

## Completed locally

- Production Next.js build passed and generated static workbench/proposal shells
  plus dynamic API and workflow handlers.
- TypeScript checking passed for the app and standalone mock service.
- Twelve contract/access tests passed: finite inputs, valid citations, insufficient
  evidence, reviewer session expiry, scoped run tokens, service authentication,
  rejected writes, rejected inherited property names, actual 503 behavior, and
  same-origin validation when the framework normalizes the internal hostname.
- HTTP smoke: healthy sample run completed; first-request 503 recovered on attempt
  two; persistent 503 exhausted retries and failed without a report.
- Fresh HTTP requests retrieved identical persisted output. Unauthorized reads,
  invalid inputs, and cross-origin requests were rejected.
- Dependency audit: zero known vulnerabilities in the locked dependency tree after compatible
  `devalue` and `nanoid` overrides for Workflow's transitive dependencies.
- The separately deployed mock returned HTTP 200 with the server credential after
  correcting its ESM configuration. It does not represent real AWS infrastructure.

## Completed on Vercel and in the browser

- The public production app passed the HTTP smoke suite: successful sample,
  transient recovery on attempt two, persistent outage with no report, retained
  output, and denied unauthorized/invalid/cross-origin requests. Recorded in
  `artifacts/deployment-smoke.json`.
- The final deployment also accepted browser-style same-origin requests. A
  completed run from the earlier deployment remained readable after redeployment.
- The production reviewer gate rejected an invalid code and issued a working
  `HttpOnly`, `Secure`, `SameSite=strict` session for the configured code. No secret
  or session token is included in `artifacts/deployment-access.json`.
- A separate preview deployment built successfully on Vercel with Node.js 22.
- Automatic GitHub deployments are pending the owner's GitHub Login Connection;
  the current deployments were created through the Vercel CLI.
- Browser checks covered starting an investigation, opening evidence citations,
  refreshing, and reconnecting to a retained result through Saved investigations.
  A fresh public production browser run completed without console errors.
- Workbench and proposal were reviewed at desktop and 390-pixel mobile viewports.
  Both mobile pages fit the document width without horizontal overflow.
- The public GitHub repository preserves four incremental implementation commits;
  subsequent handoff corrections are recorded as additional commits.
  Its public URL returned HTTP 200 without credentials.

## Pending / not claimed

- Live model quality evaluation is pending account activation. The first Gateway
  request was rejected because a card on file was required to unlock free credits.
  `artifacts/evaluation-probe.json` records that failure.
- No production customer data, load test, MTTR improvement, revenue effect,
  private VPC integration, or region-constrained model behavior has been verified.
- No statistically representative model eval or professional security audit.

The authored sample mode is a rehearsal aid, never evidence of live AI quality.
