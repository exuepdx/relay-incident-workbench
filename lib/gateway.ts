import type { StepResult, ToolSet } from "ai";
import { config } from "./config";
import type { InvestigationInput, ModelStep } from "./contracts";

/**
 * Everything that touches Vercel AI Gateway: routing options for a run and
 * the reduction of Gateway's per-call metadata into the accounting we store.
 */

/** Gateway routing for this run. */
export function gatewayOptions(_fault: InvestigationInput["fault"]) {
  const gateway: Record<string, string[]> = {};
  return { gateway };
}

type GatewayMeta = {
  cost?: string | number;
  generationId?: string;
  modelAttempts?: Array<{
    canonicalSlug?: string;
    modelId?: string;
    success?: boolean;
    providerAttempts?: Array<{ provider?: string; success?: boolean; error?: string; statusCode?: number }>;
  }>;
};

/** Reduce the agent's steps to the accounting we store and show. */
export function summarizeSteps(steps: StepResult<ToolSet, any>[]): ModelStep[] {
  return steps.map((step) => {
    const meta = (step.providerMetadata?.gateway ?? {}) as unknown as GatewayMeta;
    const attempts = (meta.modelAttempts ?? []).map((a) => ({
      model: a.canonicalSlug ?? a.modelId ?? "unknown",
      success: Boolean(a.success),
      provider: a.providerAttempts?.find((p) => p.success)?.provider ?? a.providerAttempts?.at(-1)?.provider,
      error: a.success ? undefined : a.providerAttempts?.at(-1)?.error,
    }));
    const served = attempts.find((a) => a.success)?.model ?? step.response?.modelId ?? null;
    return {
      model: served,
      inputTokens: step.usage?.inputTokens ?? null,
      outputTokens: step.usage?.outputTokens ?? null,
      costUsd: typeof meta.cost === "string" || typeof meta.cost === "number" ? String(meta.cost) : null,
      generationId: typeof meta.generationId === "string" ? meta.generationId : null,
      toolCalls: step.toolCalls.map((t) => t.toolName),
      modelAttempts: attempts,
    };
  });
}

export function totals(modelSteps: ModelStep[]) {
  const sum = (pick: (s: ModelStep) => number | null) => modelSteps.reduce((acc, s) => acc + (pick(s) ?? 0), 0);
  const costs = modelSteps.map((s) => s.costUsd).filter((c): c is string => c !== null);
  const servedBy = modelSteps.at(-1)?.model ?? null;
  return {
    totalInputTokens: sum((s) => s.inputTokens),
    totalOutputTokens: sum((s) => s.outputTokens),
    totalCostUsd: costs.length ? costs.reduce((acc, c) => acc + Number(c), 0).toFixed(6) : null,
    servedBy,
    fallbackUsed: modelSteps.some((s) => s.modelAttempts.some((a) => !a.success)) || (servedBy !== null && servedBy !== config.model),
  };
}
