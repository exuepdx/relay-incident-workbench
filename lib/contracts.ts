import { z } from "zod";

/**
 * Consumer-side contracts. Everything that crosses the boundary from the
 * customer's telemetry API is validated here before the agent or the UI sees
 * it, and everything the model produces is validated before it is stored.
 */

export const evidenceSchema = z.object({
  id: z.string().regex(/^E[1-9][0-9]*$/),
  kind: z.enum(["metric", "trace", "change", "coverage"]),
  title: z.string().max(200),
  detail: z.string().max(2000),
  source: z.string().max(120),
});
export type Evidence = z.infer<typeof evidenceSchema>;

const citations = z.array(z.string().regex(/^E[1-9][0-9]*$/)).min(1).max(6);

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
    .array(z.object({ from: z.string(), to: z.string(), label: z.string().min(1).max(100), citations }))
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
export type Topology = z.infer<typeof topologySchema>;

export const spanSchema = z.object({
  name: z.string(),
  service: z.string(),
  start: z.number().min(0),
  duration: z.number().min(0),
  color: z.enum(["purple", "orange", "red", "teal"]),
});

export const reportPolicySchema = z.object({
  singleObservedHttpCodes: z.array(z.number().int().min(100).max(599)).max(6).optional(),
  diagnosis: z.enum(["hypothesis-permitted", "withhold"]).optional(),
});

/** GET /incidents/:id — what the responder sees and what the agent is briefed with. */
export const incidentSchema = z
  .object({
    id: z.string().regex(/^INC-\d{4}$/),
    title: z.string().max(120),
    short: z.string().max(60),
    subtitle: z.string().max(240),
    question: z.string().max(240),
    severity: z.string().max(40),
    window: z.string(),
    services: z.array(z.string()).max(12),
    kpis: z.object({
      p95Ms: z.number(),
      baselineMs: z.number(),
      errorRatePct: z.number(),
      change: z.string(),
    }),
    series: z.array(z.number()).min(4).max(60),
    spans: z.array(spanSchema).max(12),
    /** Incident-record notes: what is known to be missing or unauthorized. */
    coverage: z.array(evidenceSchema).max(8),
    topology: topologySchema.optional(),
    reportPolicy: reportPolicySchema,
  })
  .strict();
export type Incident = z.infer<typeof incidentSchema>;

export const incidentListSchema = z.array(
  z.object({ id: z.string(), short: z.string(), title: z.string(), severity: z.string(), window: z.string() }),
);

/** Tool responses: a bounded list of evidence of one kind. */
export const evidenceListSchema = z.object({
  incidentId: z.string(),
  kind: z.enum(["metric", "trace", "change", "all"]),
  evidence: z.array(evidenceSchema).max(12),
});
export type EvidenceList = z.infer<typeof evidenceListSchema>;

/** Request to start an investigation. Finite inputs only. */
export const investigationInputSchema = z
  .object({
    incidentId: z.string().regex(/^INC-\d{4}$/),
    /**
     * Demo controls. `transient` makes the first telemetry call fail with 503,
     * `outage` makes every call fail, `provider-outage` routes the primary
     * model to a provider that does not serve it so Gateway falls back.
     */
    fault: z.enum(["none", "transient", "outage", "provider-outage"]).default("none"),
  })
  .strict();
export type InvestigationInput = z.infer<typeof investigationInputSchema>;

const finding = z.object({ text: z.string().min(1).max(600), citations: z.array(z.string()).min(1).max(6) });
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

/** Progress events written to the run's stream by workflow steps. */
export const progressEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("run"), status: z.enum(["started", "completed", "failed"]), at: z.string(), detail: z.string().optional() }),
  z.object({
    type: z.literal("tool"),
    tool: z.string(),
    status: z.enum(["started", "completed", "retrying", "failed"]),
    attempt: z.number().int().min(1),
    ms: z.number().optional(),
    summary: z.string().optional(),
    at: z.string(),
  }),
  z.object({ type: z.literal("model"), status: z.enum(["started", "completed"]), model: z.string().optional(), ms: z.number().optional(), at: z.string() }),
]);
export type ProgressEvent = z.infer<typeof progressEventSchema>;

/** One model step as recorded by the agent loop. */
export type ModelStep = {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: string | null;
  generationId: string | null;
  toolCalls: string[];
  modelAttempts: Array<{ model: string; success: boolean; provider?: string; error?: string }>;
};

export type Accounting = {
  startedAt: string;
  completedAt: string;
  telemetryCalls: number;
  telemetryRetries: number;
  modelSteps: ModelStep[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: string | null;
  servedBy: string | null;
  fallbackUsed: boolean;
};

export type InvestigationResult = {
  schemaVersion: 2;
  incidentId: string;
  input: InvestigationInput;
  report: Report;
  evidence: Evidence[];
  accounting: Accounting;
};

/** Stored index row for an investigation. */
export const investigationRecordSchema = z.object({
  runId: z.string(),
  incidentId: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  fault: investigationInputSchema.shape.fault,
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  model: z.string().nullable(),
  costUsd: z.string().nullable(),
  title: z.string().nullable(),
  result: z.unknown().nullable(),
});
export type InvestigationRecord = z.infer<typeof investigationRecordSchema>;

/**
 * Validate a generated report against the evidence the agent actually
 * retrieved. Unknown citations fail closed. A deliberately incomplete incident
 * cannot carry a confident diagnosis. Known wording regressions are rejected.
 */
export function validateReport(value: unknown, evidence: Evidence[], policy: Incident["reportPolicy"]): Report {
  const report = reportSchema.parse(value);
  const ids = new Set(evidence.map((e) => e.id));
  for (const item of report.findings) {
    if (item.citations.some((id) => !ids.has(id))) throw new Error(`Unknown evidence citation in finding: ${item.citations.join(",")}`);
  }
  if (policy.diagnosis === "withhold" && report.assessment !== "insufficient-evidence") {
    throw new Error("Evidence coverage does not support a diagnosis");
  }
  validateObservationScope(report, policy);
  return report;
}

/**
 * Deterministic regression guard for a failure we observed in development:
 * one representative HTTP 504 became "frequent 504s" in a live report. Not a
 * general semantic verifier; the eval harness and human review cover that.
 */
export function validateObservationScope(report: Report, policy: Incident["reportPolicy"]) {
  const fields = [report.title, report.summary, report.uncertainty, report.customerUpdate, ...report.findings.map((f) => f.text), ...report.nextSteps];
  for (const code of policy.singleObservedHttpCodes ?? []) {
    for (const field of fields) {
      if (!new RegExp(`\\b${code}\\b`).test(field)) continue;
      for (const sentence of field.split(/(?<=[.!?])\s+/).filter((s) => new RegExp(`\\b${code}\\b`).test(s))) {
        const explicitlySingle = /\b(one|single|a representative|a sampled)\b/i.test(sentence);
        const plural = new RegExp(`\\b${code}s\\b|\\b${code}\\s+(errors|responses|timeouts|traces)\\b`, "i").test(sentence);
        const frequency = /\b(frequently|often|repeated|repeatedly|multiple|widespread)\b/i.test(sentence);
        if (!explicitlySingle || plural || frequency) throw new Error(`Observation scope rejected for HTTP ${code}`);
      }
    }
    if (fields.some((s) => new RegExp(`\\b${code}s\\b`, "i").test(s))) throw new Error(`Observation scope rejected for HTTP ${code}`);
  }
}
