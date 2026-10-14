import { z } from "zod";

export const scenarioIds = [
  "checkout",
  "provider",
  "incomplete",
  "network",
] as const;
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
const citations = z
  .array(z.string().regex(/^E[1-9][0-9]*$/))
  .min(1)
  .max(6);
export const topologySchema = z.object({
  scope: z.string().min(1).max(300),
  nodes: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z][a-z0-9-]*$/),
        label: z.string().min(1).max(80),
        owner: z.string().min(1).max(80),
        status: z.enum(["affected", "baseline", "unknown"]),
        signal: z.string().min(1).max(400),
        citations,
      }),
    )
    .min(2)
    .max(12),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().min(1).max(100),
        citations,
      }),
    )
    .min(1)
    .max(20),
  handoffs: z
    .array(
      z.object({
        nodeId: z.string(),
        action: z.string().min(1).max(160),
        reason: z.string().min(1).max(400),
        confirm: z.string().min(1).max(300),
        challenge: z.string().min(1).max(300),
        citations,
      }),
    )
    .min(1)
    .max(6),
});
export const bundleSchema = z
  .object({
    scenario: z.enum(scenarioIds),
    synthetic: z.literal(true),
    window: z.string(),
    evidence: z.array(evidenceSchema).min(1).max(12),
    // Optional for retained v1 runs. New topology travels with its evidence snapshot.
    topology: topologySchema.optional(),
    reportPolicy: z
      .object({
        singleObservedHttpCodes: z
          .array(z.number().int().min(100).max(599))
          .max(6)
          .optional(),
        diagnosis: z.enum(["hypothesis-permitted", "withhold"]).optional(),
      })
      .optional(),
  })
  .strict()
  .superRefine((bundle, context) => {
    const ids = new Set(bundle.evidence.map((e) => e.id));
    if (ids.size !== bundle.evidence.length)
      context.addIssue({ code: "custom", message: "Duplicate evidence IDs" });
    if (!bundle.topology) return;
    const { nodes, edges, handoffs } = bundle.topology;
    const nodeIds = new Set(nodes.map((n) => n.id));
    if (nodeIds.size !== nodes.length)
      context.addIssue({ code: "custom", message: "Duplicate topology nodes" });
    for (const item of [...nodes, ...edges, ...handoffs]) {
      if (item.citations.some((id) => !ids.has(id)))
        context.addIssue({
          code: "custom",
          message: "Unknown topology citation",
        });
    }
    if (
      edges.some(
        (e) => !nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to,
      )
    )
      context.addIssue({ code: "custom", message: "Invalid topology edge" });
    if (handoffs.some((h) => !nodeIds.has(h.nodeId)))
      context.addIssue({
        code: "custom",
        message: "Unknown handoff owner node",
      });
  });
export type Evidence = z.infer<typeof evidenceSchema>;
export type Bundle = z.infer<typeof bundleSchema>;
export type Topology = z.infer<typeof topologySchema>;

const finding = z.object({
  text: z.string().min(1).max(600),
  citations: z.array(z.string()).min(1).max(6),
});
export const reportSchema = z.object({
  title: z.string().min(1).max(160),
  assessment: z.enum(["supported-hypothesis", "insufficient-evidence"]),
  summary: z.string().min(1).max(1000),
  findings: z.array(finding).min(2).max(4),
  nextSteps: z.array(z.string().min(20).max(400)).min(2).max(3),
  uncertainty: z.string().min(1).max(600),
  customerUpdate: z.string().min(1).max(700),
});
export type Report = z.infer<typeof reportSchema>;
export type InvestigationResult = {
  schemaVersion: 1;
  validationVersion?: 2;
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
    (bundle.scenario === "incomplete" ||
      bundle.reportPolicy?.diagnosis === "withhold") &&
    report.assessment !== "insufficient-evidence"
  ) {
    throw new Error("Evidence coverage does not support a diagnosis");
  }
  validateObservationScope(report, bundle);
  return report;
}

// A narrow regression guard, not a general semantic judge. Numeric status-code
// claims with single-observation provenance must remain explicitly singular.
// Reject unsupported wording; never silently rewrite a generated report.
export function validateObservationScope(report: Report, bundle: Bundle) {
  const fields = [
    report.title,
    report.summary,
    report.uncertainty,
    report.customerUpdate,
    ...report.findings.map((f) => f.text),
    ...report.nextSteps,
  ];
  for (const code of bundle.reportPolicy?.singleObservedHttpCodes ?? []) {
    for (const field of fields) {
      if (!new RegExp(`\\b${code}\\b`).test(field)) continue;
      const sentences = field.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences.filter((s) =>
        new RegExp(`\\b${code}\\b`).test(s),
      )) {
        const explicitlySingle =
          /\b(one|single|a representative|a sampled)\b/i.test(sentence);
        const pluralCode = new RegExp(
          `\\b${code}s\\b|\\b${code}\\s+(errors|responses|timeouts|traces)\\b`,
          "i",
        ).test(sentence);
        const frequency =
          /\b(frequently|often|repeated|repeatedly|multiple|widespread)\b/i.test(
            sentence,
          );
        if (!explicitlySingle || pluralCode || frequency)
          throw new Error(`Observation scope rejected for HTTP ${code}`);
      }
    }
    // Plural forms do not match the numeric word boundary above.
    if (fields.some((s) => new RegExp(`\\b${code}s\\b`, "i").test(s)))
      throw new Error(`Observation scope rejected for HTTP ${code}`);
  }
}
