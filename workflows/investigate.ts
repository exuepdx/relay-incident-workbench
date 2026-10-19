import { stepCountIs } from "ai";
import { Output, WorkflowAgent } from "@ai-sdk/workflow";
import { createHook, sleep } from "workflow";
import { config } from "@/lib/config";
import {
  reportSchema,
  type ApprovalDecision,
  type ApprovalOutcome,
  type InvestigationInput,
  type InvestigationResult,
} from "@/lib/contracts";
import { briefing, instructions } from "@/lib/agent";
import { gatewayOptions, summarizeSteps } from "@/lib/gateway";
import { buildTools } from "@/lib/tools";
import {
  fetchIncidentStep,
  validateRunStep,
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
 *   service owner decides or the window expires] → persist.
 *   Report and retrieved evidence are validated BEFORE any approval is offered.
 *
 * If the function instance dies, the deployment changes, or a tool call hits
 * a 503, the run resumes from the last completed step. A run can wait on an
 * approval without keeping a function running (storage and platform charges still apply). The browser only holds a run id.
 */
export async function investigate(input: InvestigationInput, requestKey?: string): Promise<InvestigationResult> {
  "use workflow";
  const startedAt = await markRunStarted(input, requestKey);
  try {
    const incident = await fetchIncidentStep(input);

    if (input.fault === "pause") {
      // The redeploy drill: a durable sleep. Push a deploy now; the existing run stays pinned to its original deployment.
      await holdPhase("started", config.pauseSeconds);
      await sleep(config.pauseSeconds * 1000);
      await holdPhase("completed", config.pauseSeconds);
    }

    const model = input.model ?? config.model;
    const agent = new WorkflowAgent({
      model,
      instructions,
      tools: buildTools(
        {
          getServiceMetrics: () => getServiceMetricsStep(input),
          getSlowTraces: () => getSlowTracesStep(input),
          getRecentChanges: () => getRecentChangesStep(input),
          proposeMitigation: (proposal) => proposeMitigationStep(proposal),
        },
        incident,
      ),
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
      result = await agent.generate({ prompt: briefing(incident), timeout: config.modelTimeoutMs });
    } catch (error) {
      throw error;
    }
    const modelSteps = summarizeSteps(result.steps);
    await modelPhase("completed", modelSteps.at(-1)?.model ?? model, Date.now() - started);

    // Human in the loop: if the agent proposed a mitigation, wait for the owner.
    let approval: ApprovalOutcome | null = null;
    const checked = await validateRunStep(
      incident,
      result.output,
      result.steps.map((step) => ({ toolCalls: step.toolCalls, toolResults: step.toolResults })),
    );
    const proposal = checked.proposal;
    if (proposal) {
      const hook = createHook<ApprovalDecision>();
      const requestedAt = await recordApprovalRequest(proposal, hook.token, checked.evidence);
      const decision = await Promise.race([
        hook as unknown as Promise<ApprovalDecision>,
        sleep(config.approvalTimeout).then((): ApprovalDecision | null => null),
      ]);
      hook.dispose();
      approval = await recordApprovalDecision(proposal, requestedAt, decision);
    }

    return await finalizeStep(input, checked.report, checked.evidence, modelSteps, startedAt, approval);
  } catch (error) {
    await markRunFailed(error instanceof Error ? error.message : "Investigation failed");
    throw error;
  }
}
