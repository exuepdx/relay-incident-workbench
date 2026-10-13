# Assessment coverage and candidate readiness

Reviewed October 13, 2026 against the full text extracted from the original
assessment webpage and the additional recruiter guidance supplied in this chat.
The original Desktop HTML is no longer at its original path; its complete earlier
extraction was recovered from this conversation. This is a requirement-by-requirement
review, not a guarantee of an interview score or production readiness.

## Recommendation and grounding

Keep Relay, with **cross-team incident triage** as the customer problem. The
candidate described enterprise retail war rooms where fragmented tools and mixed
infrastructure made blast-radius analysis and isolation slow. Several teams spent
responder hours establishing whether their systems were involved. That is a more
specific and defensible problem than a generic AI root-cause assistant.

Northstar, EKS/RDS, release hashes, metrics, and incidents are fictional. Do not
attribute those details to the real retailer or claim to have operated its stack.
The demo narrows a hypothesis from available evidence. It does not discover the
complete blast radius, prove root cause, or definitively clear a team.

| Alternative                                 | Advantage                                                                                                          | Main trade-off                                                                       | Judgment for this candidate                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Relay: cross-team triage workbench          | Strong connection to enterprise observability discovery; clear integration, AI, state, and uncertainty discussions | Existing vendors may already solve the workflow; qualify an unmet need               | Best supported by the experience shared so far                                             |
| Safer frontend releases over an AWS backend | Very direct Vercel delivery story, preview and rollback demonstration                                              | Requires credible ownership of frontend release problems and a meaningful AI role    | Prefer if the candidate has deeper release-engineering experience than currently described |
| Commerce storefront modernization           | Strong rendering, caching, and conversion story                                                                    | Broader build, more commerce/frontend details to defend; risks generic template work | Valid but less personally differentiated                                                   |

There is no provable absolute best demo. The recommendation depends on the
candidate being able to explain this customer pain and defend the built depth.
If the existing observability vendor already solves the identified workflow at
acceptable cost, recommend that capability. Vercel is justified by the custom
response experience and integrated application delivery/runtime, not by claiming
unique access to AI or replacing telemetry infrastructure.

## Explicit assessment requirements

| Brief requirement                                              | Evidence / location                                                     | Status and boundary                                                                                                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Start from a familiar, realistic customer problem              | Proposal §01; candidate's anonymized retail war-room experience         | Covered; synthetic implementation is disclosed                                                                                                               |
| Technical friction and business consequence                    | Fragmented evidence, cascading dependencies, cross-team responder hours | Covered; no invented financial-loss claims                                                                                                                   |
| Select Replace, Augment, or Connect                            | Proposal identifies **Connect**, augmenting response                    | Covered                                                                                                                                                      |
| At least three Vercel primitives, including AI                 | AI SDK, AI Gateway, Workflows, Functions, Preview Deployments           | Covered with specific roles, not a catalog list                                                                                                              |
| Name what stays outside Vercel and why                         | Proposal §02; README current/target diagrams                            | Covered: EKS services, RDS, telemetry platform, backend release pipeline, operational authority                                                              |
| Measurable technical and business outcomes                     | Proposal §06                                                            | Proposed pilot gates: 30% faster affected-boundary hypothesis, 20% fewer responder minutes, quality/cost/latency gates; no achieved customer benefit claimed |
| Small working public Vercel deployment                         | https://relay-incident-workbench.vercel.app                             | Public deployment; live AI requires reviewer code                                                                                                            |
| Auth credentials and canned examples                           | Three selectable incidents; private reviewer handoff file               | Prepared; candidate must include the code when submitting                                                                                                    |
| Actual integration across the chosen boundary                  | `workflows/steps.ts` → authenticated HTTPS → separate mock deployment   | Covered; mock is on Vercel and represents an existing system, which the brief expressly permits                                                              |
| Meaningful AI primitive                                        | Schema-validated, cited live analysis plus durable retrieval/synthesis  | Implemented; see verification and evaluation records for observed behavior                                                                                   |
| Public repo and full genuine commit history                    | https://github.com/exuepdx/relay-incident-workbench                     | Covered; incremental commits preserved                                                                                                                       |
| Comments explaining deliberate decisions                       | Access, evidence validation, retry, inference, and accounting code      | Covered                                                                                                                                                      |
| Customer-ready artifact: problem + current/target architecture | Public `/proposal`                                                      | Covered; current flow and target boundary are both visible                                                                                                   |
| Primitive rationale and trade-offs                             | Proposal §03; `docs/decisions.md`                                       | Covered, including build-versus-buy and AWS alternative                                                                                                      |
| Public URL and repository link in artifact                     | Proposal navigation, CTA, footer                                        | Covered                                                                                                                                                      |
| Preview → validation → canary → cutover → rollback             | Proposal §05                                                            | Covered as a proposed cohort pilot. Percentage traffic canaries are not implemented on Hobby                                                                 |
| Known limitations and risks                                    | Proposal §07; README                                                    | Covered: identity, retention, routing, rate limiting, semantic accuracy, state compatibility                                                                 |
| IDE/agents and AI validation disclosed                         | Proposal §08; README; evaluation artifacts                              | Covered: Codex, CLI, tests, browser checks, preserved failures, semantic review                                                                              |
| 10–15 minute customer presentation                             | `docs/presentation.md` 12-minute flow                                   | Prepared; candidate rehearsal remains required                                                                                                               |
| ~30 minute technical defense and live curveball                | Code walkthrough, runtime notes, objection and change exercises         | Prepared; candidate mastery cannot be certified by automated checks                                                                                          |
| Submission timing                                              | Brief conflicts: two vs three business days; 45 vs 60 minutes           | Plan three business days early; candidate should confirm logistics with recruiter                                                                            |

## Additional recruiter guidance

| Guidance                     | What demonstrates it                                                                              | Remaining candidate responsibility                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Depth and intentionality     | Authenticated integration, durable state, scoped access, failure injection, live model accounting | Explain why these features solve the customer problem                                                     |
| UX and design quality        | Responsive workbench, source inspection, saved runs, errors, uncertainty, improved contrast       | Walk through it at interview zoom and rehearse failure states                                             |
| Customer-facing presentation | Proposal framed around the customer, alternatives, pilot gates, and risks                         | Use discovery questions and adapt to the interviewer's responses                                          |
| Own AI-assisted work         | Real commit history; failed outputs and fixes preserved; code walkthrough                         | Review every submitted claim and make a small live change unaided                                         |
| Product/tool feedback        | `docs/product-feedback.md` records observed friction and strengths                                | Personalize the wording; distinguish the assistant's build observations from personal hands-on experience |

## Helpful resources are not additional mandatory features

Cache Components, ISR, streaming, agent tool loops, Bedrock, Eve, percentage-based
Rolling Releases, and private VPC connectivity are suggestions and examples. The
brief does not require implementing all of them. Relay uses a bounded workflow
with one model call, rather than model-selected tools. Adding a tool loop or
autonomous remediation solely to satisfy a perceived checklist would weaken the
scope and increase the depth the candidate must defend.

## Final readiness requires the candidate

The implementation and documentary coverage can be checked. A "100% ready"
claim also requires the candidate to rehearse, understand the code, validate the
AI output, supply reviewer access, and submit on time. No recruiter submission
has been sent. See `verification.md` for actual test results and their limits.
