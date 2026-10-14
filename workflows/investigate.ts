import { stepCountIs } from "ai";
import { Output, WorkflowAgent } from "@ai-sdk/workflow";
import { config } from "@/lib/config";
import { reportSchema, type Incident, type InvestigationInput, type InvestigationResult } from "@/lib/contracts";
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
  markRunFailed,
  markRunStarted,
  modelPhase,
} from "./steps";

/**
 * One investigation, end to end, as a durable workflow.
 *
 *   briefing (customer API) → agent loop (model calls and tool calls are
 *   steps) → evidence register (customer API) → validate + persist.
 *
 * If the function instance dies, the deployment changes, or a tool call hits
 * a 503, the run resumes from the last completed step. The browser only
 * holds a run id.
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

  const agent = new WorkflowAgent({
    model: config.model,
    instructions,
    tools: buildTools({
      getServiceMetrics: () => getServiceMetricsStep(input),
      getSlowTraces: () => getSlowTracesStep(input),
      getRecentChanges: () => getRecentChangesStep(input),
    }),
    output: Output.object({ schema: reportSchema }),
    stopWhen: stepCountIs(config.maxAgentSteps),
    toolChoice: "auto",
    maxOutputTokens: config.maxOutputTokens,
    maxRetries: config.modelRetries,
    providerOptions: gatewayOptions(input.fault),
  });

  await modelPhase("started", config.model);
  const started = Date.now();
  let result: Awaited<ReturnType<typeof agent.generate>>;
  try {
    result = await agent.generate({ prompt: briefing(incident) });
  } catch (error) {
    await markRunFailed(`Model generation failed: ${error instanceof Error ? error.message : "unknown"}`);
    throw error;
  }
  const modelSteps = summarizeSteps(result.steps);
  await modelPhase("completed", modelSteps.at(-1)?.model ?? config.model, Date.now() - started);

  const register = await fetchRegisterStep(input);
  return finalizeStep(input, incident, register, result.output, modelSteps, startedAt);
}
