import type { LanguageModel, StepResult, ToolSet } from "ai";
import { config } from "./config";
import type { InvestigationInput, ModelStep } from "./contracts";
import { installFakeGatewayRedirect } from "./fake-gateway";

// Offline harness only (no-op unless RELAY_FAKE_GATEWAY_URL is set outside production).
// Installed here as well as in instrumentation.ts because workflow steps run in
// their own bundle and a dev-server worker restart can skip the instrumentation hook.
installFakeGatewayRedirect();

/**
 * Everything that touches Vercel AI Gateway: which model to call, how the
 * Gateway should route and fail over, and how its per-call metadata turns
 * into the accounting we store and show.
 */

/**
 * The model for a run: always a Gateway slug. On Vercel the Gateway
 * authenticates with the project's OIDC token; locally with
 * AI_GATEWAY_API_KEY. The offline harness redirects Gateway traffic at the
 * fetch layer (lib/fake-gateway.ts) rather than passing a model instance,
 * because instances carry async auth headers that cannot be serialized
 * across workflow steps.
 */
export function resolveModel(): LanguageModel {
  return config.model;
}

/**
 * Gateway routing for this run.
 *
 * - models: ordered fallbacks tried when the primary has no healthy provider
 * - order / only: provider preference and allow-list (the "stay on Bedrock" story)
 * - provider-outage drill: pin the primary to a provider that does not serve
 *   it, so the request takes the same failover path as a real outage.
 */
export function gatewayOptions(fault: InvestigationInput["fault"]) {
  const gateway: Record<string, string[]> = {};
  if (config.fallbackModels.length) gateway.models = config.fallbackModels;
  if (config.providerOrder.length) gateway.order = config.providerOrder;
  if (config.providerOnly.length) gateway.only = config.providerOnly;
  if (fault === "provider-outage") gateway.only = [config.outageDrillProviderOnly];
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
