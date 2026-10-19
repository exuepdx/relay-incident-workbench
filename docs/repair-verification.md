# Repair verification — updated 2026-10-19

This records the repair pass after the imported Fable revision. See `review-2026-10-18.md` for the original findings and `demo-script.md` for the presentation.

## Repairs

| Review issue                                                  | Change                                                                                                                              | Verification                                                                                                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Broken report and comparison citations                        | Each citation opens the immutable source retained by that run; pending approvals also carry their evidence.                         | Browser: report, comparison, and pending approval source dialogs; Escape restores focus.                                                                            |
| Approval before validation                                    | Validate the report, exact read transcript, proposal, known owner and incident policy before recording a pending approval.          | Regression tests reject invented citations/owners, missing reads, premature proposals and operational actions with insufficient evidence.                           |
| Unread evidence granted by a later catalog fetch              | Build the allowed evidence set from successful tool results and briefing coverage only.                                             | Missing-source and conflicting-source tests; every live evaluation uses this same runtime validator.                                                                |
| Leaking evaluation answers                                    | Remove measurements and curated handoffs from the briefing; remove spans when removing trace evidence.                              | Eight cases include an unlabeled uncertainty case and unrelated-policy counter-evidence.                                                                            |
| Lost-response duplicate starts and unsafe persistence updates | Persist request-key reservations, bind runs before inference, retry persistence separately, and update Postgres fields atomically.  | Seven offline workflow scenarios passed, including repeated start with the same key. A real Postgres integration script is prepared; execution awaits provisioning. |
| False UI timeout during approvals                             | Continue status polling until terminal state; show reconnecting versus waiting states; abort work on unmount.                       | Browser approval run paused, displayed its source, accepted a demo decision, then retained the final report.                                                        |
| Dependency advisories                                         | Override the affected transitive Nano ID dependency.                                                                                | Production dependency audit: zero vulnerabilities.                                                                                                                  |
| Presentation claims and density                               | Six main presenter screens; deployment facts separated from plans; pilot targets labeled; data crossings and alternatives explicit. | Desktop browser inspection; arrow keys work after activating the Present link.                                                                                      |
| Incorrect served-model accounting                             | Read nested Gateway routing metadata rather than the requested response model.                                                      | Unit regression and live fallback routing probe.                                                                                                                    |
| Report metadata leaked into action text                       | Sentence-shape constraints reject schema paths and citation metadata in next actions.                                               | Dedicated regression and the live evaluation contract hash.                                                                                                         |
| Status-code invention introduced by a prompt example          | Remove the overly specific example and reject HTTP codes absent from the evidence.                                                  | Dedicated regression test; final primary live suite rerun after this change.                                                                                        |

## Completed checks

- Node 22 unit/regression suite: **36/36 passed**, including production adapter selection without a registration import.
- Application and customer API typechecks: passed.
- Final Next.js production build: passed after the citation-scope and budget-status fixes.
- Final offline workflow suite: **7/7 expected outcomes**, including a deliberate outage that must fail before inference.
- Desktop browser: report/compare/pending-approval source dialogs, focus return, evidence-tab arrows, approval completion, reopening a saved run, retained evidence after changing tabs, and six-screen presenter navigation.
- Live Gateway outage routing: primary unavailable, candidate served, nested routing metadata recorded. Automatic fallback remains off for normal runs.
- Final primary live evaluation: **8/8 cases passed** under one prompt/contract version. The four budget-blocked cases were resumed after the owner approved a $2 total cap; the combined artifact records batch provenance and the blocked attempt remains intact.
- Hosted Neon Postgres integration: passed concurrency, replay, fresh-connection persistence and duplicate-start checks. The free database is connected to Preview and Production.
- Catalog-map source dialogs are explicitly separate from saved-run source dialogs; both were checked in the browser after reopening a completed report.

## Deployment evidence

The separate telemetry service is deployed and verified using authenticated GET requests for all required route shapes, including nested incident/evidence paths and the legacy network scenario. Unauthenticated reads are rejected. `artifacts/telemetry-deployment-verification.json` records the HTTP checks. The standalone service uses TypeScript 5.9.3 because the Vercel Node adapter's TypeScript 7 compilation produced type-resolution diagnostics; the main Next.js project retains its locked compiler.

The rebuilt preview compiled successfully on Vercel. Its reviewer sign-in succeeds, its session endpoint reports the intended model with automatic fallback disabled, and its run index reports Postgres. Hosted workflow smoke and production promotion are in progress. The prior production deployment is historical evidence only.

## Model judgment

Automated passes are necessary, not sufficient. Reading the reports caught unsupported HTTP-code and dependency wording that an earlier eight-case pass did not catch. The failed artifacts and that intermediate pass are retained. No artifact has been relabeled as human-approved.

The comparison candidate failed the single-observation wording guard. Automatic cross-model fallback is disabled for normal runs. The explicit demo outage drill verifies Gateway routing through actual metadata; it does not qualify the candidate's report quality. A human presenter still needs to review the final reports against their sources before a customer pilot.

Assistant source review of the eight generated reports found the previously observed HTTP-code invention, pluralized single observation and next-step metadata defects absent; the wrong-subnet case retained its counter-evidence and the injected instruction did not determine the report. This is not human sign-off: the draft customer update can describe a proposed investigation as underway, so the presenter must confirm action status before sharing.

The local smoke and browser runs used a fake Gateway. Their costs, served-model values and generated reports are simulated. They establish workflow/UI behavior, not inference quality, latency or spend. Live model artifacts are labeled `mode: live` and contain prompt hashes, source hashes, outputs and accounting.

## Remaining release gate

1. Verify live investigation, abstention, approval, retries and a completed report from a new browser context.
2. Promote, rehearse rollback/deploy continuity, update this record and the customer artifact with observed results.
