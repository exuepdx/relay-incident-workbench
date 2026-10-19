import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { customerGet, type CustomerFetchOptions } from "./customer-client";
import {
  evidenceListSchema,
  validateProposal,
  incidentSchema,
  mitigationProposalSchema,
  type EvidenceList,
  type Incident,
  type MitigationProposal,
} from "./contracts";

/**
 * The agent's tool boundary.
 *
 * Three read-only tools, each backed by one endpoint of the customer's
 * telemetry API, plus one write-shaped tool that only records a request:
 * proposeMitigation. The model can choose which to call and in what order;
 * it cannot choose a URL, a query, or an incident other than the one under
 * investigation, and nothing it calls changes a system. In the workflow each
 * execute is a durable, retried step, and a proposal pauses the run until a
 * service owner decides.
 */
export const readToolNames = ["getServiceMetrics", "getSlowTraces", "getRecentChanges"] as const;
export type ReadToolName = (typeof readToolNames)[number];
export type ToolName = ReadToolName | "proposeMitigation";

export const toolSpecs: Record<ReadToolName, { path: "metrics" | "traces" | "changes"; description: string }> = {
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
};

export const proposeMitigationDescription =
  "Request one operational mitigation (for example a configuration revert) from the accountable service owner. This records a proposal for human approval; it executes nothing. Call it at most once, only when the evidence supports a specific, reversible action, and never for an insufficient-evidence assessment.";

export type ProposalReceipt = { recorded: true; status: "pending-validation"; note: string };

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

export type ToolExecutors = {
  getServiceMetrics: () => Promise<EvidenceList>;
  getSlowTraces: () => Promise<EvidenceList>;
  getRecentChanges: () => Promise<EvidenceList>;
  proposeMitigation: (proposal: MitigationProposal) => Promise<ProposalReceipt>;
};

/** Build the AI SDK tool set from executors (workflow steps or plain functions). */
export function buildTools(execute: ToolExecutors, incident: Incident): ToolSet {
  const tools: ToolSet = {};
  const retrieved = new Map(incident.coverage.map((e) => [e.id, e]));
  const reads = new Set<string>();
  let proposed = false;
  for (const name of readToolNames) {
    tools[name] = tool({
      description: toolSpecs[name].description,
      inputSchema: z.object({}),
      execute: async () => {
        const list = evidenceListSchema.parse(await execute[name]());
        if (list.incidentId !== incident.id) throw new Error("Evidence belongs to another incident");
        list.evidence.forEach((e) => retrieved.set(e.id, e));
        reads.add(name);
        return list;
      },
    });
  }
  tools.proposeMitigation = tool({
    description: proposeMitigationDescription,
    inputSchema: mitigationProposalSchema,
    execute: async (proposal) => {
      if (!readToolNames.every((name) => reads.has(name)))
        throw new Error("Read every evidence source before proposing mitigation");
      if (proposed) throw new Error("Only one mitigation proposal is permitted");
      const checked = validateProposal(proposal, [...retrieved.values()], incident);
      proposed = true;
      return execute.proposeMitigation(checked);
    },
  });
  return tools;
}

/** Plain receipt for executors outside the workflow (evals). */
export async function acknowledgeProposal(proposal: MitigationProposal): Promise<ProposalReceipt> {
  return {
    recorded: true,
    status: "pending-validation",
    note: `Draft for ${proposal.owner}; approval is available only after report and evidence validation. Nothing executes.`,
  };
}
