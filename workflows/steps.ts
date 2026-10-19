import { FatalError, RetryableError, getStepMetadata, getWorkflowMetadata, getWritable } from "workflow";
import { config } from "@/lib/config";
import { CustomerApiError } from "@/lib/customer-client";
import { fetchEvidence, fetchIncident, summarizeEvidence, type ProposalReceipt } from "@/lib/tools";
import {
  type Evidence,
  type Report,
  type Accounting,
  type ApprovalDecision,
  type ApprovalOutcome,
  type EvidenceList,
  type Incident,
  type InvestigationInput,
  type InvestigationResult,
  type MitigationProposal,
  type ModelStep,
  type ProgressEvent,
} from "@/lib/contracts";
import { validateAgentRun } from "@/lib/run-validation";
import { totals } from "@/lib/gateway";
import { getStore } from "@/lib/store";
import "@/lib/store-postgres";
import { installFakeGatewayRedirect } from "@/lib/fake-gateway";

/**
 * Workflow steps. Each is durable: its result is persisted, retries are
 * governed by maxRetries, and a crash or deploy between steps resumes here.
 */

const PROGRESS = "progress";
const now = () => new Date().toISOString();

/** Write one progress event to the run's stream. Steps only. */
async function emit(event: ProgressEvent) {
  const writer = getWritable<ProgressEvent>({ namespace: PROGRESS }).getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

export async function markRunStarted(input: InvestigationInput, requestKey?: string) {
  "use step";
  const at = now();
  const { workflowRunId } = getWorkflowMetadata();
  const store = getStore();
  if (requestKey) await store.bindStart(requestKey, workflowRunId);
  await store.create({
    runId: workflowRunId,
    incidentId: input.incidentId,
    status: "running",
    fault: input.fault,
    createdAt: at,
    completedAt: null,
    model: null,
    costUsd: null,
    title: null,
    result: null,
    approval: null,
  });
  await emit({
    type: "run",
    status: "started",
    at,
    detail: `${input.incidentId} · fault=${input.fault}${input.model ? ` · model=${input.model}` : ""}`,
  });
  return at;
}

/**
 * Shared shape for every call across the boundary: announce the attempt,
 * call, announce the outcome, and let the workflow runtime retry on 503.
 */
async function telemetryCall<T>(
  name: string,
  input: InvestigationInput,
  call: (options: { fault?: "unavailable" }) => Promise<T>,
  summarize: (value: T) => string,
  faultTarget: boolean,
): Promise<T> {
  const { attempt } = getStepMetadata();
  const started = Date.now();
  await emit({ type: "tool", tool: name, status: "started", attempt, at: now() });
  const fault =
    input.fault === "outage" || (input.fault === "transient" && faultTarget && attempt === 1)
      ? ("unavailable" as const)
      : undefined;
  try {
    const value = await call({ fault });
    await emit({
      type: "tool",
      tool: name,
      status: "completed",
      attempt,
      ms: Date.now() - started,
      summary: summarize(value),
      at: now(),
    });
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telemetry call failed";
    const retryable = error instanceof CustomerApiError ? error.retryable : true;
    const willRetry = retryable && attempt <= config.telemetryRetries;
    await emit({
      type: "tool",
      tool: name,
      status: willRetry ? "retrying" : "failed",
      attempt,
      ms: Date.now() - started,
      summary: willRetry ? `${message}. Retrying in ${config.telemetryRetryAfter}.` : message,
      at: now(),
    });
    if (retryable) throw new RetryableError(message, { retryAfter: config.telemetryRetryAfter });
    throw new FatalError(message);
  }
}

export async function fetchIncidentStep(input: InvestigationInput): Promise<Incident> {
  "use step";
  return telemetryCall(
    "getIncident",
    input,
    (o) => fetchIncident(input.incidentId, o),
    (i) => `${i.short} · ${i.coverage.length} coverage notes`,
    false,
  );
}
fetchIncidentStep.maxRetries = config.telemetryRetries;

export async function getServiceMetricsStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  return telemetryCall(
    "getServiceMetrics",
    input,
    (o) => fetchEvidence(input.incidentId, "metrics", o),
    summarizeEvidence,
    false,
  );
}
getServiceMetricsStep.maxRetries = config.telemetryRetries;

export async function getSlowTracesStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  // The transient-503 drill targets this call so the retry happens inside the agent loop.
  return telemetryCall(
    "getSlowTraces",
    input,
    (o) => fetchEvidence(input.incidentId, "traces", o),
    summarizeEvidence,
    true,
  );
}
getSlowTracesStep.maxRetries = config.telemetryRetries;

export async function getRecentChangesStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  return telemetryCall(
    "getRecentChanges",
    input,
    (o) => fetchEvidence(input.incidentId, "changes", o),
    summarizeEvidence,
    false,
  );
}
getRecentChangesStep.maxRetries = config.telemetryRetries;

export async function fetchRegisterStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  return telemetryCall(
    "getEvidenceRegister",
    input,
    (o) => fetchEvidence(input.incidentId, "evidence", o),
    summarizeEvidence,
    false,
  );
}
fetchRegisterStep.maxRetries = config.telemetryRetries;

/** The agent asked for a mitigation. Record it; it executes nothing. */
export async function proposeMitigationStep(proposal: MitigationProposal): Promise<ProposalReceipt> {
  "use step";
  await emit({
    type: "tool",
    tool: "proposeMitigation",
    status: "completed",
    attempt: 1,
    ms: 0,
    summary: `${proposal.owner}: ${proposal.action}`,
    at: now(),
  });
  return {
    recorded: true,
    status: "pending-validation",
    note: `Draft for ${proposal.owner}; report and evidence validation must pass before approval.`,
  };
}
proposeMitigationStep.maxRetries = 0;

export async function modelPhase(status: "started" | "completed", model?: string, ms?: number) {
  "use step";
  installFakeGatewayRedirect(); // offline harness only; no-op otherwise
  await emit({ type: "model", status, model, ms, at: now() });
}

/** The redeploy drill: announce the hold; the workflow sleeps durably. */
export async function holdPhase(status: "started" | "completed", seconds: number) {
  "use step";
  await emit({ type: "pause", status, seconds, at: now() });
}

/** Persist the pending approval so the API can resume the hook by run id. */
export async function recordApprovalRequest(proposal: MitigationProposal, token: string, evidence: Evidence[]) {
  "use step";
  const { workflowRunId } = getWorkflowMetadata();
  const requestedAt = now();
  await getStore().update(workflowRunId, { approval: { status: "pending", token, proposal, evidence, requestedAt } });
  await emit({
    type: "approval",
    status: "requested",
    detail: `${proposal.owner}: ${proposal.action}`,
    at: requestedAt,
  });
  return requestedAt;
}

/** Persist the owner's decision (or expiry) and announce it. */
export async function recordApprovalDecision(
  proposal: MitigationProposal,
  requestedAt: string,
  decision: ApprovalDecision | null,
): Promise<ApprovalOutcome> {
  "use step";
  const { workflowRunId } = getWorkflowMetadata();
  const decidedAt = now();
  const outcome: ApprovalOutcome = {
    proposal,
    decision: decision?.decision ?? "expired",
    by: decision?.by ?? null,
    note: decision?.note ?? null,
    requestedAt,
    decidedAt,
  };
  await getStore().update(workflowRunId, {
    approval: { status: outcome.decision, proposal, requestedAt, decidedAt, by: outcome.by, note: outcome.note },
  });
  await emit({
    type: "approval",
    status: outcome.decision,
    detail:
      outcome.decision === "expired"
        ? "No decision within the approval window; nothing was changed."
        : `${outcome.decision} by ${outcome.by}${outcome.note ? ` · ${outcome.note}` : ""}`,
    at: decidedAt,
  });
  return outcome;
}

/** Pure validation fails permanently; database writes below remain retryable steps. */
export async function validateRunStep(...args: Parameters<typeof validateAgentRun>) {
  "use step";
  try {
    return validateAgentRun(...args);
  } catch (error) {
    throw new FatalError(error instanceof Error ? error.message : "Invalid analysis");
  }
}
validateRunStep.maxRetries = 0;

export async function finalizeStep(
  input: InvestigationInput,
  report: Report,
  evidence: Evidence[],
  modelSteps: ModelStep[],
  startedAt: string,
  approval: ApprovalOutcome | null,
): Promise<InvestigationResult> {
  "use step";
  const { workflowRunId } = getWorkflowMetadata();
  const completedAt = now();
  const accounting: Accounting = {
    startedAt,
    completedAt,
    modelSteps,
    ...totals(modelSteps, input.model ?? config.model),
  };
  const result: InvestigationResult = {
    schemaVersion: 2,
    incidentId: input.incidentId,
    input,
    report,
    evidence,
    accounting,
    ...(approval ? { approval } : {}),
  };
  // A transient storage fault retries this step, never the already-paid inference.
  await getStore().update(workflowRunId, {
    status: "completed",
    completedAt,
    model: accounting.servedBy,
    costUsd: accounting.totalCostUsd,
    title: report.title,
    result,
  });
  await emit({
    type: "run",
    status: "completed",
    at: completedAt,
    detail: `${accounting.servedBy ?? "model"} · $${accounting.totalCostUsd ?? "n/a"}`,
  });
  return result;
}
finalizeStep.maxRetries = 3;

export async function markRunFailed(detail: string) {
  "use step";
  const { workflowRunId } = getWorkflowMetadata();
  await getStore().update(workflowRunId, { status: "failed", completedAt: now() });
  await emit({ type: "run", status: "failed", at: now(), detail });
}
