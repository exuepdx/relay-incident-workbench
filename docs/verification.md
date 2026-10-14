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

## Live evaluation

- Production deployment `dpl_7grKpuJZzydKefRjrSfHj9U7kEUa` uses source `951b279`,
  `ENABLE_LIVE_AI=true`, and `AI_MODEL=openai/gpt-5.2`. Local and Vercel production
  builds passed; app and mock typechecks and all 12 tests passed.
- The hosted live suite completed all three scenarios with real Gateway usage.
  Provider retrieval recovered on attempt two. Fresh requests returned identical
  retained reports; unauthenticated live calls, invalid reviewer codes, and
  unscoped run reads were denied. Secure reviewer-session attributes were verified.
  Evidence: `artifacts/deployment-live.json`.
- The final budget read reported $0.23206155 model spend against the active $1
  non-refreshing project cap. No credits were purchased; platform costs are separate.
  Evidence: `artifacts/deployment-budget.json`.
- Public app, proposal, and GitHub repository all returned HTTP 200 without account
  cookies after deployment.
- The deployed sample smoke suite passed again, including permanent upstream 503
  failure with no report, invalid inputs, and cross-origin rejection.
- A browser live checkout run completed after refresh/history reconnect. Its
  citations displayed the fetched evidence; customer-update copy matched the draft;
  JSON export contained live mode, the selected model, and all four findings.
- Gateway inference succeeded after account activation. The final four-case GPT-5.2
  evaluation passed structural/citation checks and the injection-marker check.
  Assistant semantic review and measured cost/latency are in `evaluation-review.md`;
  independent candidate review remains pending. Earlier failing outputs are preserved.
- Hosted repetition still exposed one provider-summary generalization (plural
  504s from a single observed response). It is documented, not counted as perfect
  semantic accuracy. Human review is required before using the draft.
- Limited visual/accessibility review improved text contrast and checked desktop
  workbench/proposal layouts, mobile reflow, keyboard tabs, modal focus, labels, and
  failure states. This is not a complete WCAG audit or screen-reader certification.

## Pending / not claimed

- No production customer data, load test, MTTR improvement, revenue effect,
  private VPC integration, or region-constrained model behavior has been verified.
- No statistically representative model eval or professional security audit.

The authored sample mode is a rehearsal aid, never evidence of live AI quality.

## Cascading incident release: local verification

- The final production build passed, including TypeScript and static page generation.
- Twenty tests passed, including the actual earlier 504 regression, graph and
  citation integrity, versioned adapter compatibility, and withholding a policy
  bypass when path evidence is missing. App and mock typechecks passed.
- The local four-run HTTP suite passed: checkout and network samples, provider
  transient recovery, and permanent upstream outage without a report. Network
  output retained six nodes and three handoffs; fresh reads returned identical
  state. Invalid requests and unauthorized reads remained denied.
- Seven live model cases passed the expanded checks; reports and review limits
  are recorded in `evaluation-review.md` and `artifacts/evaluation.json`.
- Browser review at desktop and 390px mobile covered owner selection, unknown
  underlay evidence, citations, three-tab keyboard navigation, copying handoffs,
  and a sample run with retrieved topology. Mobile map/cards had no horizontal
  overflow. A limited DOM contrast check found no below-threshold leaf text; it
  is not a full accessibility audit.
