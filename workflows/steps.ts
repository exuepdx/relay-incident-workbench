import { FatalError, RetryableError, getStepMetadata, getWorkflowMetadata, getWritable } from "workflow";
import { config } from "@/lib/config";
import { CustomerApiError } from "@/lib/customer-client";
import { fetchEvidence, fetchIncident, summarizeEvidence } from "@/lib/tools";
import { validateReport, type Accounting, type EvidenceList, type Incident, type InvestigationInput, type InvestigationResult, type ModelStep, type ProgressEvent } from "@/lib/contracts";
import { totals } from "@/lib/gateway";
import { getStore } from "@/lib/store";

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

export async function markRunStarted(input: InvestigationInput) {
  "use step";
  const at = now();
  await emit({ type: "run", status: "started", at, detail: `${input.incidentId} · fault=${input.fault}` });
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
    input.fault === "outage" || (input.fault === "transient" && faultTarget && attempt === 1) ? ("unavailable" as const) : undefined;
  try {
    const value = await call({ fault });
    await emit({ type: "tool", tool: name, status: "completed", attempt, ms: Date.now() - started, summary: summarize(value), at: now() });
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
  return telemetryCall("getIncident", input, (o) => fetchIncident(input.incidentId, o), (i) => `${i.short} · ${i.coverage.length} coverage notes`, false);
}
fetchIncidentStep.maxRetries = config.telemetryRetries;

export async function getServiceMetricsStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  return telemetryCall("getServiceMetrics", input, (o) => fetchEvidence(input.incidentId, "metrics", o), summarizeEvidence, false);
}
getServiceMetricsStep.maxRetries = config.telemetryRetries;

export async function getSlowTracesStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  // The transient-503 drill targets this call so the retry happens inside the agent loop.
  return telemetryCall("getSlowTraces", input, (o) => fetchEvidence(input.incidentId, "traces", o), summarizeEvidence, true);
}
getSlowTracesStep.maxRetries = config.telemetryRetries;

export async function getRecentChangesStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  return telemetryCall("getRecentChanges", input, (o) => fetchEvidence(input.incidentId, "changes", o), summarizeEvidence, false);
}
getRecentChangesStep.maxRetries = config.telemetryRetries;

export async function fetchRegisterStep(input: InvestigationInput): Promise<EvidenceList> {
  "use step";
  return telemetryCall("getEvidenceRegister", input, (o) => fetchEvidence(input.incidentId, "evidence", o), summarizeEvidence, false);
}
fetchRegisterStep.maxRetries = config.telemetryRetries;

export async function modelPhase(status: "started" | "completed", model?: string, ms?: number) {
  "use step";
  await emit({ type: "model", status, model, ms, at: now() });
}

/**
 * Validate the report against the register, persist, and announce. A report
 * that fails validation fails the run: no diagnosis is ever substituted.
 */
export async function finalizeStep(
  input: InvestigationInput,
  incident: Incident,
  register: EvidenceList,
  output: unknown,
  modelSteps: ModelStep[],
  startedAt: string,
): Promise<InvestigationResult> {
  "use step";
  const { workflowRunId } = getWorkflowMetadata();
  const store = getStore();
  const completedAt = now();
  const accounting: Accounting = { startedAt, completedAt, modelSteps, ...totals(modelSteps) };
  try {
    const report = validateReport(output, register.evidence, incident.reportPolicy);
    const result: InvestigationResult = { schemaVersion: 2, incidentId: input.incidentId, input, report, evidence: register.evidence, accounting };
    await store.update(workflowRunId, {
      status: "completed",
      completedAt,
      model: accounting.servedBy,
      costUsd: accounting.totalCostUsd,
      title: report.title,
      result,
    });
    await emit({ type: "run", status: "completed", at: completedAt, detail: `${accounting.servedBy ?? "model"} · $${accounting.totalCostUsd ?? "n/a"}` });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report validation failed";
    await store.update(workflowRunId, { status: "failed", completedAt, model: accounting.servedBy, costUsd: accounting.totalCostUsd });
    await emit({ type: "run", status: "failed", at: completedAt, detail: message });
    throw new FatalError(message);
  }
}
finalizeStep.maxRetries = 0;

export async function markRunFailed(detail: string) {
  "use step";
  const { workflowRunId } = getWorkflowMetadata();
  await getStore().update(workflowRunId, { status: "failed", completedAt: now() });
  await emit({ type: "run", status: "failed", at: now(), detail });
}
