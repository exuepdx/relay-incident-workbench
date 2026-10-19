import { stepCountIs } from "ai";
import { Output, WorkflowAgent } from "@ai-sdk/workflow";
import { createHook, sleep } from "workflow";
import { config } from "@/lib/config";
import {
  mitigationProposalSchema,
  reportSchema,
  type ApprovalDecision,
  type ApprovalOutcome,
  type Incident,
  type InvestigationInput,
  type InvestigationResult,
  type MitigationProposal,
} from "@/lib/contracts";
import { briefing, instructions } from "@/lib/agent";
import { gatewayOptions, summarizeSteps } from "@/lib/gateway";
import { buildTools } from "@/lib/tools";
import {
  fetchIncidentStep,
  fetchRegisterStep,
  finalizeStep,
  getRecentChangesStep,
  getServiceMetricsStep,
  getSlowTracesStep,
  holdPhase,
  markRunFailed,
  markRunStarted,
  modelPhase,
  proposeMitigationStep,
  recordApprovalDecision,
  recordApprovalRequest,
} from "./steps";

/**
 * One investigation, end to end, as a durable workflow.
 *
 *   briefing (customer API) → agent loop (model calls and tool calls are
 *   steps) → [pause on a hook if the agent proposed a mitigation, until a
 *   service owner decides or the window expires] → evidence register →
 *   validate + persist.
 *
 * If the function instance dies, the deployment changes, or a tool call hits
 * a 503, the run resumes from the last completed step. A run can wait on an
 * approval for minutes or days at no cost. The browser only holds a run id.
 */
export async function investigate(input: InvestigationInput): Promise<InvestigationResult> {
  "use workflow";
  const startedAt = await markRunStarted(input);
  let incident: Incident;
  try {
    incident = await fetchIncidentStep(input);
  } catch (error) {
    await markRunFailed(`Could not reach the telemetry API: ${error instanceof Error ? error.message : "unknown"}`);
    throw error;
  }

  if (input.fault === "pause") {
    // The redeploy drill: a durable sleep. Push a deploy now; the run finishes on the new one.
    await holdPhase("started", config.pauseSeconds);
    await sleep(config.pauseSeconds * 1000);
    await holdPhase("completed", config.pauseSeconds);
  }

  const model = input.model ?? config.model;
  const agent = new WorkflowAgent({
    model,
    instructions,
    tools: buildTools({
      getServiceMetrics: () => getServiceMetricsStep(input),
      getSlowTraces: () => getSlowTracesStep(input),
      getRecentChanges: () => getRecentChangesStep(input),
      proposeMitigation: (proposal) => proposeMitigationStep(proposal),
    }),
    output: Output.object({ schema: reportSchema }),
    stopWhen: stepCountIs(config.maxAgentSteps),
    toolChoice: "auto",
    maxOutputTokens: config.maxOutputTokens,
    maxRetries: config.modelRetries,
    providerOptions: gatewayOptions(input.fault),
    telemetry: { isEnabled: true, functionId: "relay.investigate" },
  });

  await modelPhase("started", model);
  const started = Date.now();
  let result: Awaited<ReturnType<typeof agent.generate>>;
  try {
    result = await agent.generate({ prompt: briefing(incident) });
  } catch (error) {
    await markRunFailed(`Model generation failed: ${error instanceof Error ? error.message : "unknown"}`);
    throw error;
  }
  const modelSteps = summarizeSteps(result.steps);
  await modelPhase("completed", modelSteps.at(-1)?.model ?? model, Date.now() - started);

  // Human in the loop: if the agent proposed a mitigation, wait for the owner.
  let approval: ApprovalOutcome | null = null;
  const proposal = findProposal(result.steps);
  if (proposal) {
    const hook = createHook<ApprovalDecision>();
    const requestedAt = await recordApprovalRequest(proposal, hook.token);
    const decision = await Promise.race([
      hook as unknown as Promise<ApprovalDecision>,
      sleep(config.approvalTimeout).then((): ApprovalDecision | null => null),
    ]);
    hook.dispose();
    approval = await recordApprovalDecision(proposal, requestedAt, decision);
  }

  const register = await fetchRegisterStep(input);
  return finalizeStep(input, incident, register, result.output, modelSteps, startedAt, approval);
}

/** The first valid proposeMitigation call, if the agent made one. */
function findProposal(
  steps: Array<{ toolResults: Array<{ toolName: string; input: unknown }> }>,
): MitigationProposal | null {
  for (const step of steps) {
    for (const call of step.toolResults) {
      if (call.toolName !== "proposeMitigation") continue;
      const parsed = mitigationProposalSchema.safeParse(call.input);
      if (parsed.success) return parsed.data;
    }
  }
  return null;
}
