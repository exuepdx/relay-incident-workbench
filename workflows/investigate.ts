import type { InvestigationInput } from "@/lib/contracts";
import { collectEvidence, synthesizeReport, finalizeReport } from "./steps";

export async function investigate(input: InvestigationInput) {
  "use workflow";
  const evidence = await collectEvidence(input);
  const analysis = await synthesizeReport(evidence.bundle, input.mode);
  return finalizeReport(input, evidence, analysis);
}
