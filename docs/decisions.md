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

Three fixed synthetic incidents keep the public exercise reproducible and bounded.
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
