# Relay: architectural decisions

## Customer and problem

Northstar Commerce is a fictional enterprise customer. Its checkout and inventory
services run on AWS EKS, with RDS Postgres and an external payments provider,
and an existing observability platform already stores metrics, traces, and change
events. During incidents, responders manually connect evidence across views before
they can explain business impact and choose the next diagnostic step.

The candidate's real experience is selling observability to enterprise customers.
This scenario applies that perspective; it is not a claimed customer engagement.

## Boundary

Vercel's primary role is Connect, augmenting the response experience. The application reads a narrow,
authenticated telemetry API. AWS services, databases, telemetry storage, retention,
alerting, and operational permissions stay with the customer. The model receives
only a bounded synthetic evidence bundle in this demo. It cannot execute arbitrary
queries or remediate an incident.

The demo API is a separate deployable service that represents the existing estate.
It is an explicitly labeled mock, not an actual AWS or observability integration.

## Depth chosen deliberately

- Vercel Workflows persists investigation execution and outputs across browser
  disconnects. The browser remembers run IDs, not durable execution state.
- AI SDK produces a schema-validated report; citations are validated against the
  retrieved evidence. An uncertainty label is an assessment, not a probability.
- AI Gateway provides the model boundary and usage visibility.
- Vercel Functions hosts the API and workflow steps. Preview Deployments support
  review of changes with separate configuration.
- A polished evidence workbench and customer proposal make the decisions inspectable.

## Scope and honest limits

Four fixed synthetic incidents keep the public exercise reproducible and bounded.
No production telemetry, personal data, autonomous remediation, or customer accounts.
Browser-local history is convenience, not enterprise tenancy. A production deployment
needs SSO, tenant authorization, persistent audit access, shared admission controls,
and a tested data retention policy. Hobby deployment must not depend on Rolling
Releases or Secure Compute. Their production roles are described separately.

We will distinguish live AI output, authored sample output, measured performance,
and hypothetical customer outcomes. A sample response must never masquerade as AI.

## Implementation chronology

1. Frame the customer, boundary, and intended proof before implementation.
2. Implement the telemetry contract and durable investigation path.
3. Build the evidence workbench and proposal.
4. Validate contracts, failure paths, AI behavior, and deployment.

Commit history records actual development. Do not squash or fabricate milestones.

## Cascading incident and ownership

The lead scenario applies the candidate's retailer war-room experience: checkout
symptoms cascade from inventory waiting on a database connection. Selected flow
records support investigating the network path; the nearby firewall change is a
hypothesis, and physical device coverage is unknown. Successful query metrics do
not clear the Data Platform team.

The six-node map, status, owners, and three proposed handoffs are curated synthetic
context in the authenticated adapter response. They are not AI-discovered topology
or independent measurements. Each item references evidence IDs, and node/edge/owner
references are validated. The interface previews the fixture before a run, then
uses the fetched snapshot retained with that run. Layout is specific to this
bounded scene. Production would need a reviewed catalog/telemetry normalization
layer, freshness rules, and a more general layout.

Copying a handoff includes scope, window, rationale, confirming and challenging
checks, and source text. No incident is assigned and no team is notified. This
keeps the prototype read-only while demonstrating a concrete coordination outcome.

## Quality guard and compatibility

One observed HTTP 504 previously became plural errors in a live report. The
adapter now marks that measurement's single-observation scope; the model prompt
preserves it and deterministic validation rejects known plural/frequency patterns.
This is a narrow regression guard, not a general semantic verifier. Invalid
reports fail visibly rather than being silently rewritten or retried.

Seven live evaluation cases include removed path evidence, misleading unrelated
network changes, and injected device instructions. Counterfactual cases remove
the original curated topology to avoid leaking the desired answer. Candidate
review remains necessary, and development failures are retained.

The adapter honors evidence version 2 for new clients and omits new optional
fields for old strict clients. The mock can therefore deploy first without
breaking the old app. Stored result schema remains compatible; validationVersion
marks new reports, while older live reports display a review notice.
