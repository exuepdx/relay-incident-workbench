import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { customerGet, type CustomerFetchOptions } from "./customer-client";
import { evidenceListSchema, incidentSchema, type EvidenceList, type Incident } from "./contracts";

/**
 * The agent's tool boundary.
 *
 * Three read-only tools, each backed by one endpoint of the customer's
 * telemetry API. The model can choose which to call and in what order; it
 * cannot choose a URL, a query, or an incident other than the one under
 * investigation. In the workflow each execute is a durable, retried step.
 */
export const toolSpecs = {
  getServiceMetrics: {
    path: "metrics",
    description:
      "Fetch request-rate, latency, error-rate, and dependency metrics for the incident window. Returns evidence items with ids you can cite.",
  },
  getSlowTraces: {
    path: "traces",
    description:
      "Fetch the representative slow trace and the sampled slow-span summary for the incident. Returns evidence items with ids you can cite.",
  },
  getRecentChanges: {
    path: "changes",
    description:
      "Fetch releases, configuration, and network-policy changes near the incident window. Returns evidence items with ids you can cite.",
  },
} as const;
export type ToolName = keyof typeof toolSpecs;
export const toolNames = Object.keys(toolSpecs) as ToolName[];

export function fetchIncident(incidentId: string, options?: CustomerFetchOptions): Promise<Incident> {
  return customerGet(`/incidents/${incidentId}`, incidentSchema, options);
}

export function fetchEvidence(
  incidentId: string,
  kind: "metrics" | "traces" | "changes" | "evidence",
  options?: CustomerFetchOptions,
): Promise<EvidenceList> {
  return customerGet(`/incidents/${incidentId}/${kind}`, evidenceListSchema, options);
}

export function summarizeEvidence(list: EvidenceList): string {
  const n = list.evidence.length;
  return `${n} evidence item${n === 1 ? "" : "s"}: ${list.evidence.map((e) => e.id).join(", ")}`;
}

export type ToolExecutors = Record<ToolName, () => Promise<EvidenceList>>;

/** Build the AI SDK tool set from executors (workflow steps or plain functions). */
export function buildTools(execute: ToolExecutors): ToolSet {
  const tools: ToolSet = {};
  for (const name of toolNames) {
    tools[name] = tool({
      description: toolSpecs[name].description,
      inputSchema: z.object({}),
      execute: async () => execute[name](),
    });
  }
  return tools;
}
