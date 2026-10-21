# Implementation decisions

These are the decisions in the current demo, with their costs and limits. The
customer scenario is based on enterprise observability experience; Northstar's
specific stack and incident data are fictional.

## Vercel components and the working boundary

| Component  | Responsibility in this implementation                                         | Source                                                                  |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Next.js    | Static shell, cached incident catalog, request-time investigation status      | [Catalog caching](../lib/incidents.ts)                                  |
| Workflows  | Durable steps, retry, approval hooks and reconnectable execution              | [Investigation workflow](../workflows/investigate.ts)                   |
| AI SDK     | Bounded tool definitions and structured report generation inside the workflow | [Tools](../lib/tools.ts), [agent workflow](../workflows/investigate.ts) |
| AI Gateway | Model routing and actual served-model / cost accounting                       | [Gateway adapter](../lib/gateway.ts)                                    |

These four components have distinct jobs; the three AI-stack components also meet
the three-primitive minimum independently. Neon is external Postgres, not counted
as a Vercel primitive.

The customer's existing world is represented by the separately deployed
`relay-telemetry-mock.vercel.app` service. Relay makes real authenticated HTTPS
requests for metrics, traces and changes through the [customer client](../lib/customer-client.ts).
It enforces a server-configured destination, a server-held bearer token, read-only
requests, a timeout and response schemas. The [HTTP verification record](../artifacts/telemetry-deployment-verification.json)
includes rejected unauthenticated requests and successful authenticated reads.
The data is synthetic and the mock runs on Vercel; this is not an AWS deployment.
Neon provides an additional external boundary for Relay's report storage, but it
does not represent the customer's existing transaction database.

## Connect to existing telemetry

Relay reads a scoped API instead of building another ingestion and alerting system.
The problem being explored is coordination across teams that already have tools.
That keeps the demo focused on the affected dependency, supporting evidence and
next owner. It also makes Relay dependent on the API's coverage and availability.

If the existing observability product already joins the required sources and
supports the workflow, using that product would be simpler than operating Relay.
The [separate API](../customer-api/README.md) is synthetic and deployed on Vercel;
its Lambda adapter is available for a future AWS deployment.

## Keep the agent bounded

The agent can request metrics, traces and changes, then propose a report and an
optional mitigation for review. It cannot execute a change. All three reads are
required, and validation runs against their actual results before approval is shown.
The map and prepared handoffs are deliberately separate from the agent's inputs.

A fixed retrieval pipeline followed by one model call is a credible simpler
alternative. The agent is useful here for demonstrating conditional tool ordering
and an optional proposal, but adds model steps and cost. A pilot should compare the
two approaches rather than assume that an agent improves the outcome.

See [tool definitions](../lib/tools.ts), [validation](../lib/run-validation.ts)
and [regressions](../tests/safety.test.ts).

## Store reports separately from workflow execution

Workflows handles retries, pauses and reconnects. Postgres retains reports,
evidence snapshots and approval decisions beyond workflow execution retention.
This adds a database to operate, but makes a report link usable after a run's step
stream is unavailable and allows the report index to use customer-controlled Postgres.
Workflow state itself remains on Vercel.

Start requests reserve an idempotency key before dispatch. An ambiguous start is
not automatically dispatched again: avoiding a duplicate paid run takes priority
over an invisible retry. A hosted bundling failure also led to an explicit Postgres
import instead of side-effect adapter registration.

See [hosted persistence checks](../artifacts/postgres-verification.json) and the
[preserved bundling failure](../artifacts/hosted-workflow-first-attempt.json).

## Qualify fallback models separately

The Gemini comparison candidate passed the routing probe but failed a report-quality
check. Normal runs therefore have automatic fallback disabled. This sacrifices some
availability to avoid silently returning a model that has not passed the same checks.
Explicit comparison and outage drills still exercise the candidate.

See [candidate results](../artifacts/evaluation-gemini-repair.json) and
[actual routing metadata](../artifacts/fallback-verification.json). The primary
suite's eight passing cases came from two batches after the project budget
interrupted the first attempt; that provenance remains in the artifact.

## Limit approval to recording a decision

The reviewer code gates new investigations and demo approvals. It does not establish
an enterprise identity or prove that the reviewer owns a service. An approval writes
a record and resumes the workflow; there is no change-execution integration.

A production action would need verified owner identity, scoped permissions,
idempotent execution and an audited rollback path. That is outside this demo's scope.

## Preserve deployment continuity

A workflow stays on the deployment that started it. The promotion rehearsal verified
that a run started on A could finish after B became public. The rollback rehearsal
verified that the saved report remained accessible with the same evidence hash.
Neither rehearsal demonstrates moving an in-flight run onto new code.

CI checks PRs. Hosted preview verification and production promotion currently use
the CLI; the repository contains an optional preview-smoke workflow, but its GitHub
integration and secrets are not configured.

## Development history

The initial implementation, imported rebuild, repairs and presentation work remain
in Git. These links provide a short route through that history:

| Change                                                                                                   | What to inspect                                                       |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Reviewed rebuild import](https://github.com/exuepdx/relay-incident-workbench/commit/8ddae3f)            | Evidence, approval and persistence repairs after the imported version |
| [Preserve imported history](https://github.com/exuepdx/relay-incident-workbench/commit/03a9504)          | Merge connecting the original and Fable source histories              |
| [Hosted persistence and evaluations](https://github.com/exuepdx/relay-incident-workbench/commit/9ef5d61) | Production bundling fix and final adversarial cases                   |
| [Hosted release verification](https://github.com/exuepdx/relay-incident-workbench/commit/55936fb)        | Real workflow, promotion and rollback evidence                        |
| [Visual redesign](https://github.com/exuepdx/relay-incident-workbench/commit/8eda17e)                    | Workbench layout and dependency-map changes                           |
| [Copy cleanup](https://github.com/exuepdx/relay-incident-workbench/commit/15988c0)                       | Specific incident language and shorter presentation headings          |

Codex and Fable assisted this work. The failed artifacts are retained so the reasons
for the runtime guards and disabled fallback are visible.
