# Repair verification — updated 2026-10-19

This records the repair pass after the imported Fable revision. See `review-2026-10-18.md` for the original findings and `demo-script.md` for the presentation.

## Repairs

| Review issue                                                  | Change                                                                                                                              | Verification                                                                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Broken report and comparison citations                        | Each citation opens the immutable source retained by that run; pending approvals also carry their evidence.                         | Browser: report, comparison, and pending approval source dialogs; Escape restores focus.                                                                                |
| Approval before validation                                    | Validate the report, exact read transcript, proposal, known owner and incident policy before recording a pending approval.          | Regression tests reject invented citations/owners, missing reads, premature proposals and operational actions with insufficient evidence.                               |
| Unread evidence granted by a later catalog fetch              | Build the allowed evidence set from successful tool results and briefing coverage only.                                             | Missing-source and conflicting-source tests; every live evaluation uses this same runtime validator.                                                                    |
| Leaking evaluation answers                                    | Remove measurements and curated handoffs from the briefing; remove spans when removing trace evidence.                              | Eight cases include an unlabeled uncertainty case and unrelated-policy counter-evidence.                                                                                |
| Lost-response duplicate starts and unsafe persistence updates | Persist request-key reservations, bind runs before inference, retry persistence separately, and update Postgres fields atomically.  | Seven offline workflow scenarios passed, including repeated start with the same key. Hosted Postgres concurrency, replay and duplicate-start integration checks passed. |
| False UI timeout during approvals                             | Continue status polling until terminal state; show reconnecting versus waiting states; abort work on unmount.                       | Browser approval run paused, displayed its source, accepted a demo decision, then retained the final report.                                                            |
| Dependency advisories                                         | Override the affected transitive Nano ID dependency.                                                                                | Production dependency audit: zero vulnerabilities.                                                                                                                      |
| Presentation claims and density                               | Six main presenter screens; deployment facts separated from plans; pilot targets labeled; data crossings and alternatives explicit. | Desktop browser inspection; arrow keys work after activating the Present link.                                                                                          |
| Incorrect served-model accounting                             | Read nested Gateway routing metadata rather than the requested response model.                                                      | Unit regression and live fallback routing probe.                                                                                                                        |
| Report metadata leaked into action text                       | Sentence-shape constraints reject schema paths and citation metadata in next actions.                                               | Dedicated regression and the live evaluation contract hash.                                                                                                             |
| Status-code invention introduced by a prompt example          | Remove the overly specific example and reject HTTP codes absent from the evidence.                                                  | Dedicated regression test; final primary live suite rerun after this change.                                                                                            |

## Completed checks

- Node 22 unit/regression suite: **36/36 passed**, including production adapter selection without a registration import.
- Application and customer API typechecks: passed.
- Final Next.js production build: passed after the citation-scope and budget-status fixes.
- Final offline workflow suite: **7/7 expected outcomes**, including a deliberate outage that must fail before inference.
- Hosted workflow suite: **7/7 expected outcomes** with real Gateway calls and Postgres, including approval, decline, transient retry, pause/resume and failure before inference during a full outage. `artifacts/deployment-smoke.json` records the run IDs and accounting.
- Desktop browser: report/compare/pending-approval source dialogs, focus return, evidence-tab arrows, approval completion, reopening a saved run, retained evidence after changing tabs, and six-screen presenter navigation.
- Live Gateway outage routing: primary unavailable, candidate served, nested routing metadata recorded. Automatic fallback remains off for normal runs.
- Final primary live evaluation: **8/8 cases passed** under one prompt/contract version. The four budget-blocked cases were resumed after the owner approved a $2 total cap; the combined artifact records batch provenance and the blocked attempt remains intact.
- Hosted Neon Postgres integration: passed concurrency, replay, fresh-connection persistence and duplicate-start checks. The free database is connected to Preview and Production.
- Catalog-map source dialogs are explicitly separate from saved-run source dialogs; both were checked in the browser after reopening a completed report.

## Deployment evidence

The separate telemetry service is deployed and verified using authenticated GET requests for all required route shapes, including nested incident/evidence paths and the legacy network scenario. Unauthenticated reads are rejected. `artifacts/telemetry-deployment-verification.json` records the HTTP checks. The standalone service uses TypeScript 5.9.3 because the Vercel Node adapter's TypeScript 7 compilation produced type-resolution diagnostics; the main Next.js project retains its locked compiler.

The rebuilt preview compiled successfully on Vercel and passed all seven hosted scenarios before production promotion. Reviewer sign-in succeeds, the session endpoint reports the intended model with automatic fallback disabled, and the run index reports Postgres. The public workbench is `https://relay-incident-workbench.vercel.app`; the presentation is `/proposal?present=1`.

Production continuity was tested by starting a real workflow on deployment A, observing its durable pause, promoting B, and reading its completed report through B. The workflow remained pinned to A; this is continuity across promotion, not migration onto new code. Instant Rollback to A retained the same completed report and evidence hash; B was then restored. See `artifacts/deployment-continuity.json` and `artifacts/deployment-rollback.json`.

## Model judgment

Automated passes are necessary, not sufficient. Reading the reports caught unsupported HTTP-code and dependency wording that an earlier eight-case pass did not catch. The failed artifacts and that intermediate pass are retained. No artifact has been relabeled as human-approved.

The comparison candidate failed the single-observation wording guard. Automatic cross-model fallback is disabled for normal runs. The explicit demo outage drill verifies Gateway routing through actual metadata; it does not qualify the candidate's report quality. A human presenter still needs to review the final reports against their sources before a customer pilot.

Assistant source review of the eight generated reports found the previously observed HTTP-code invention, pluralized single observation and next-step metadata defects absent; the wrong-subnet case retained its counter-evidence and the injected instruction did not determine the report. This is not human sign-off: the draft customer update can describe a proposed investigation as underway, so the presenter must confirm action status before sharing.

The local smoke and browser runs used a fake Gateway. Their costs, served-model values and generated reports are simulated. They establish workflow/UI behavior, not inference quality, latency or spend. Live model artifacts are labeled `mode: live` and contain prompt hashes, source hashes, outputs and accounting.

## Release scope

The hosted investigation, abstention, approval, decline, retry, pause and outage checks passed. Production promotion and rollback were rehearsed. Public saved-report access was checked in a new browser tab without a Vercel bypass credential. The final copy pass labels saved timestamps as UTC and describes an unavailable timeline without guessing why it is unavailable.

This is a technical demo with synthetic evidence and demo reviewer authentication. Automatic cross-model fallback remains disabled, customer outcomes remain proposed targets, and human approval remains required before sharing draft customer updates. GitHub's preview-event integration and an enforced promotion gate are not configured; this release used a manually verified CLI preview.

## Visual refresh — 2026-10-19

The workbench now uses graphite surfaces, ice-blue selection accents, an architectural SVG sculpture and a wider dependency map. The presentation's 3D composition reserves space for its text. Metrics render their actual values immediately; the compact p95 line uses the existing incident series. Selected connections express catalog relationships, not a confirmed cause. The dark palette is the default, with an explicit saved light preference preserved.

The 36 regression tests, TypeScript check, production build and GitHub CI passed. Browser checks covered both themes, component/owner selection, catalog citations, Escape focus restoration, evidence-tab arrow navigation and the presentation. A narrow-screen review found crowded owner labels; mobile cards now grow with their content, and very narrow screens use a single-column component list. Reduced-motion rules remain in place. The agent, workflow, API and evaluation contracts did not change, so live inference evaluations were not rerun for this visual revision. The saved production report remained unchanged after deployment.

## Interface and presentation copy — 2026-10-19

Removed the sidebar slogan and decorative section labels. Incident headings now describe the observed problem; presentation headings identify the customer problem, architecture, demo, pilot targets and rollout. Investigation help is an expandable disclosure. Approval copy still explains that recording a decision executes no change. The pause timeline no longer implies that a workflow moves to the newest deployment.

Display titles live in the existing customer UI configuration. Telemetry fixtures, model instructions, validation, workflows and API behavior are unchanged; existing live evaluation results still apply to those inputs. The 36 tests and application typecheck passed. Browser review covered the workbench, presentation and investigation-help disclosure. The local Turbopack worker could not bind its port; the Webpack production build is the local fallback, with the standard build also checked by Vercel before promotion.

## Visual presentation — 2026-10-19

The proposal now has six visual screens: overview, the incident dependency path,
architecture, an illustrated investigation, pilot targets and deployment rollout.
The architecture toggles between the actual hosted demo and a proposed customer
pilot. Product layers reveal their purpose and trade-off on selection. The
investigation illustrates normal review, a retry and missing evidence without
calling a model. Rollout controls distinguish new-request routing from existing
workflow execution and retained reports.

Technical detail remains in collapsed discussion notes and a reference section,
including data boundaries, limitations, evaluation failures, AI assistance and
product feedback. Pilot targets remain explicitly proposed; trace durations come
from the existing synthetic fixture. No report, workflow or model contract changed.

Local verification: all 36 regression tests, application typecheck and the Webpack
production build passed. Browser review checked six screens at 1280 × 720, stacked
diagrams and the static hero at 390 × 844, and page overflow at a 304px panel width.
Checks covered architecture selection, missing evidence, retry playback, motion
pause, keyboard slide navigation, cutover/rollback controls and notes navigation.
A hydration race between the motion provider and presenter boundary was fixed;
a fresh browser load showed no errors. Animation stops offscreen and respects
reduced-motion preferences. The demo script now follows the visual controls.

## Architecture decisions presentation — 2026-10-20

Added a seventh screen with three selectable decision diagrams: request-key
reservation before dispatch, evidence validation before approval, and model
qualification before enabling automatic fallback. Each shows the trigger, guard,
outcome, alternative and accepted cost, with a link to its regression or evaluation
evidence. Manual steps and optional replay explain the implementation without
starting investigations. The fallback panel labels qualification as a release
decision, not a runtime model-quality check.

The architecture view names all four Vercel components, labels the authenticated
HTTP boundary, and distinguishes the separately deployed mock from a proposed
AWS customer estate. Neon is identified as Relay's report store. The decision
record and twelve-minute demo script follow the same story.

All 36 regression tests, application typecheck and the Webpack production build
passed. Browser checks covered all decision choices, replay, manual keyboard
activation without advancing the slide, motion-off behavior, seven screens at
1280 × 720, and responsive layouts at 390px and 304px without horizontal overflow.
No inference, workflow, persistence or authentication contracts changed, and no
new paid inference was needed. The local 3D dependency logs an existing Three.js
Clock deprecation warning; no browser errors were observed.

The deployed telemetry boundary was also rechecked: unauthenticated incident
access returned 401; authenticated metrics, traces and changes for INC-0244
returned 200 and matched the consumer's evidence schema. These checks performed
only reads of synthetic telemetry and made no model calls.

Final hosted review found a deep-link alignment issue: entering presentation mode
changed the heights before the requested slide. The presenter now re-anchors any
known slide after applying its layout, so a shared decision-slide URL includes the
title. A fresh browser load verified the slide begins at the top of the viewport.

## Customer presentation coverage — 2026-10-20

The main walkthrough now has nine visual screens. The incident names the fictional
customer, scenario stack and coordination cost. Architecture switches between the
current manual investigation, proposed target and actual hosted demo, with explicit
reasons to retain transaction authority, release controls and telemetry retention.
The new kickoff screen makes identity, data handling, evidence quality and operational
scope visible, with a customer decision and owner for each. The build screen names
Codex desktop, Fable, GitHub CI and Vercel CLI, then exposes regression, live model
and hosted verification evidence. Tool attribution reflects the actual development
history; the narrative focuses on decisions and outcomes rather than prompts.

The revised twelve-minute script maps every customer-facing topic to a main visual.
Business and technical targets remain proposed. Recorded evaluation counts come
from the existing artifacts; no live model calls were added for presentation work.

Local checks passed: 36 regression tests, application typecheck and Webpack production build. Browser review
covered all three architecture states, four kickoff panels, three validation views,
keyboard activation without changing slides, paused animation and 390px / 304px
layouts without horizontal overflow. All nine slides fit at 1280 × 720; no browser
errors were observed. The production build and hosted checks are required before
promotion, with the saved report's evidence hash compared across release.
