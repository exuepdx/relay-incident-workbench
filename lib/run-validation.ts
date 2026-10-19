import { evidenceListSchema, validateReport, validateProposal, type Evidence, type Incident } from "./contracts";
import { readToolNames } from "./tools";

type AgentStep = {
  toolCalls: Array<{ toolName: string; input: unknown }>;
  toolResults: Array<{ toolName: string; output: unknown }>;
};

/** Replay the actual tool transcript. No subsequent catalog fetch can grant a citation. */
export function validateAgentRun(incident: Incident, output: unknown, steps: AgentStep[]) {
  const seen = new Map<string, Evidence>(incident.coverage.map((e) => [e.id, e]));
  const reads = new Set<string>();
  let proposal: ReturnType<typeof validateProposal> | null = null;
  for (const step of steps) {
    // Calls precede results: a proposal in the same batch cannot cite unread results.
    for (const call of step.toolCalls) {
      if (call.toolName !== "proposeMitigation") continue;
      if (!readToolNames.every((name) => reads.has(name))) throw new Error("Proposal preceded required evidence reads");
      if (proposal) throw new Error("Multiple mitigation proposals are not permitted");
      proposal = validateProposal(call.input, [...seen.values()], incident);
    }
    for (const result of step.toolResults) {
      if (!readToolNames.includes(result.toolName as (typeof readToolNames)[number])) continue;
      const list = evidenceListSchema.parse(result.output);
      if (list.incidentId !== incident.id) throw new Error("Evidence belongs to another incident");
      for (const evidence of list.evidence) {
        const previous = seen.get(evidence.id);
        if (previous && JSON.stringify(previous) !== JSON.stringify(evidence))
          throw new Error("Conflicting evidence snapshots");
        seen.set(evidence.id, evidence);
      }
      reads.add(result.toolName);
    }
  }
  if (!readToolNames.every((name) => reads.has(name))) throw new Error("Missing required evidence reads");
  const evidence = [...seen.values()].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  const report = validateReport(output, evidence, incident.reportPolicy);
  if (proposal) validateProposal(proposal, evidence, incident, report);
  return { report, evidence, proposal };
}
