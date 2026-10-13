import { z } from "zod";

export const scenarioIds = ["checkout", "provider", "incomplete"] as const;
export type ScenarioId = (typeof scenarioIds)[number];
export const requestSchema = z
  .object({
    scenario: z.enum(scenarioIds),
    mode: z.enum(["live", "sample"]),
    fault: z.enum(["none", "transient", "outage"]).default("none"),
  })
  .strict();
export type InvestigationInput = z.infer<typeof requestSchema>;

export const evidenceSchema = z.object({
  id: z.string().regex(/^E[1-9][0-9]*$/),
  kind: z.enum(["metric", "trace", "change", "coverage"]),
  title: z.string().max(200),
  detail: z.string().max(2000),
  source: z.string().max(100),
});
export const bundleSchema = z
  .object({
    scenario: z.enum(scenarioIds),
    synthetic: z.literal(true),
    window: z.string(),
    evidence: z.array(evidenceSchema).min(1).max(12),
  })
  .strict();
export type Evidence = z.infer<typeof evidenceSchema>;
export type Bundle = z.infer<typeof bundleSchema>;

const finding = z.object({
  text: z.string().min(1).max(600),
  citations: z.array(z.string()).min(1).max(6),
});
export const reportSchema = z.object({
  title: z.string().min(1).max(160),
  assessment: z.enum(["supported-hypothesis", "insufficient-evidence"]),
  summary: z.string().min(1).max(1000),
  findings: z.array(finding).min(2).max(4),
  nextSteps: z.array(z.string().min(1).max(400)).min(2).max(4),
  uncertainty: z.string().min(1).max(600),
  customerUpdate: z.string().min(1).max(700),
});
export type Report = z.infer<typeof reportSchema>;
export type InvestigationResult = {
  schemaVersion: 1;
  scenario: ScenarioId;
  mode: "live" | "sample";
  report: Report;
  bundle: Bundle;
  telemetry: {
    startedAt: string;
    completedAt: string;
    retrievalMs: number;
    retrievalAttempts: number;
    modelMs: number;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: string | null;
    gatewayRequestId: string | null;
  };
};

export function validateReport(value: unknown, bundle: Bundle): Report {
  const report = reportSchema.parse(value);
  const ids = new Set(bundle.evidence.map((e) => e.id));
  for (const item of report.findings) {
    if (item.citations.some((id) => !ids.has(id)))
      throw new Error("Unknown evidence citation");
  }
  // A deliberately incomplete case must not produce a confident diagnosis.
  // This validates a known fixture constraint; it does not prove semantic truth.
  if (
    bundle.scenario === "incomplete" &&
    report.assessment !== "insufficient-evidence"
  ) {
    throw new Error("Evidence coverage does not support a diagnosis");
  }
  return report;
}
