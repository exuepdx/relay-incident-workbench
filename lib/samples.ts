import type { Report, ScenarioId } from "./contracts";

// These are authored rehearsal reports, never represented as model output.
export const samples: Record<ScenarioId, Report> = {
  network: {
    title: "Investigate the inventory-to-database network path",
    assessment: "supported-hypothesis",
    summary:
      "Checkout symptoms span both releases. Sampled inventory requests wait on a database connection handshake, while rejects increased on that path. Network Platform and Inventory Services should correlate the two signals before proposing mitigation.",
    findings: [
      {
        text: "Both checkout release cohorts degraded at 17:14; p95 reached 3,180ms and API errors reached 7.4%.",
        citations: ["E1", "E5"],
      },
      {
        text: "The representative trace spends 2,450ms in the database connection handshake; 16 of 20 slow samples have handshake waits above two seconds.",
        citations: ["E2"],
      },
      {
        text: "Rejected connections rose to 18% in sampled flows on the inventory-to-database path after a policy update. Individual flows have not been linked to the slow traces.",
        citations: ["E3", "E6"],
      },
      {
        text: "Successful queries and payment latency remain near baseline. Device counters are missing, so the evidence neither clears whole teams nor identifies a failed physical device.",
        citations: ["E4", "E6"],
      },
    ],
    nextSteps: [
      "Ask Network Platform and Inventory Services to match trace connection timestamps and source/destination identity to the rejected flow records.",
      "Compare the policy diff, affected paths, and existing device counters; use unaffected traffic as counter-evidence before choosing a mitigation.",
      "Only with the service owners’ approval, design a controlled policy comparison after correlation is established; measure connection waits and checkout errors before declaring recovery.",
    ],
    uncertainty:
      "The evidence supports a path-level hypothesis, not a confirmed policy cause or failed device. Sampled flows and traces do not establish the full blast radius; there is no controlled comparison or measured recovery.",
    customerUpdate:
      "Checkout and inventory are degraded in the observed window. The evidence points toward connection delays on the inventory-to-database path, but the cause is unconfirmed. The proposed next step is for Network Platform and Inventory Services to correlate traces with network records. Any operational change requires owner approval.",
  },
  checkout: {
    title: "Connection-pool contention is the leading hypothesis",
    assessment: "supported-hypothesis",
    summary:
      "The slow checkout path spends most of its sampled time waiting for an inventory database connection. A lower pool limit preceded the increase. The timing and pool metrics agree, but a controlled check is still needed to establish causality.",
    findings: [
      {
        text: "Checkout p95 rose from 420ms to 2,840ms while request volume stayed stable. The API error rate reached 6.8%.",
        citations: ["E1"],
      },
      {
        text: "The representative trace spends 2,190ms acquiring a DB connection. The same pattern appears in 18 of 20 slow sampled traces.",
        citations: ["E2"],
      },
      {
        text: "The pool maximum fell from 20 to 5 before the alert; pending requests grew to 84 while database CPU and payment latency stayed near baseline.",
        citations: ["E3", "E4"],
      },
    ],
    nextSteps: [
      "Verify the deployed pool setting and compare old and new release cohorts under equivalent load.",
      "Ask the service owner to approve a controlled pool-setting revert or rollback; monitor checkout p95, errors, and pool wait time.",
      "Validate recovery before declaring resolution; preserve the evidence for the incident review.",
    ],
    uncertainty:
      "A deployment correlation is not a confirmed root cause. We have no controlled mitigation result, and sampled traces may not represent every request.",
    customerUpdate:
      "We are investigating elevated checkout latency and errors. Current evidence points to connection-pool contention in the inventory path. The team is validating a configuration change before proposing mitigation. Revenue impact and resolution time are not yet established.",
  },
  provider: {
    title: "Payment authorization is the leading suspect",
    assessment: "supported-hypothesis",
    summary:
      "Slow payment-provider calls dominate the sampled requests, and the symptom affects both application versions. The nearby presentation change is weak evidence for a release regression.",
    findings: [
      {
        text: "Both release cohorts show elevated checkout latency and errors, which weakens the case for blaming the new version.",
        citations: ["E1", "E3"],
      },
      {
        text: "One representative trace records HTTP 504 and 2,880ms in payment authorization. Separately, 17 of 20 slow samples have slow authorization; their response codes are unspecified.",
        citations: ["E2"],
      },
      {
        text: "Inventory latency, database CPU, and pool wait metrics remain normal. Provider-side confirmation is still missing.",
        citations: ["E4", "E5"],
      },
    ],
    nextSteps: [
      "Check the provider status and compare payment latency by endpoint and region.",
      "Escalate to the payment owner with the trace IDs; verify idempotency before considering any retry-policy change.",
      "Continue comparing release cohorts; do not assume an application rollback will resolve an upstream failure.",
    ],
    uncertainty:
      "These observations localize the delay but do not distinguish a provider incident from a network path issue. Provider-side evidence is needed.",
    customerUpdate:
      "Some checkout requests are encountering slow or failed payment authorization. We are coordinating with the payment team and validating the upstream path. The current evidence does not isolate the issue to the latest release.",
  },
  incomplete: {
    title: "The symptom is clear. The cause is not.",
    assessment: "insufficient-evidence",
    summary:
      "Checkout is degraded, but missing dependency spans and simultaneous changes prevent a defensible diagnosis. The next useful action is to restore evidence coverage.",
    findings: [
      {
        text: "Checkout p95 is 1,920ms and the API error rate is 4.1%, establishing a real degradation.",
        citations: ["E1"],
      },
      {
        text: "Missing inventory, database, and payment child spans prevent attribution of the delay to a dependency.",
        citations: ["E2"],
      },
      {
        text: "The application release and network-policy change cannot be separated with the current evidence. No revenue impact has been measured.",
        citations: ["E3", "E4"],
      },
    ],
    nextSteps: [
      "With the observability owner’s approval, repair the collector configuration and capture representative end-to-end traces.",
      "Collect per-release and per-dependency latency and error measurements for the affected window.",
      "Compare the two changes using the new evidence before proposing a specific mitigation.",
    ],
    uncertainty:
      "There is insufficient evidence to name a root cause or select a rollback target. Missing telemetry is a visibility problem, not proof of the application failure's cause.",
    customerUpdate:
      "Checkout performance is degraded. We are restoring missing diagnostic telemetry to distinguish between potential causes. We cannot yet confirm a root cause, financial impact, or recovery time.",
  },
};
