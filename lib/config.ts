/**
 * One place for every knob a reviewer might ask to change live.
 *
 * Everything here is read from the environment with a sensible default so a
 * curveball ("Bedrock only", "halve the budget", "swap the model") is a
 * one-line change in Vercel project settings or in this file.
 */

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  /** Primary model through Vercel AI Gateway. */
  model: process.env.AI_MODEL || "openai/gpt-5.2",
  /** Tried in order when the primary has no healthy provider. */
  fallbackModels: list(process.env.AI_FALLBACK_MODELS).length
    ? list(process.env.AI_FALLBACK_MODELS)
    : ["anthropic/claude-sonnet-5", "google/gemini-2.5-flash"],
  /**
   * Models a reviewer may pick for a side-by-side comparison. The primary is
   * always allowed; anything else must be listed here.
   */
  comparisonModels: list(process.env.AI_COMPARISON_MODELS).length
    ? list(process.env.AI_COMPARISON_MODELS)
    : ["anthropic/claude-sonnet-5", "google/gemini-2.5-flash"],
  /** Provider preference per model (e.g. ["bedrock", "anthropic"]). */
  providerOrder: list(process.env.AI_PROVIDER_ORDER),
  /** Hard allow-list of providers (e.g. ["bedrock"] for a data-placement constraint). */
  providerOnly: list(process.env.AI_PROVIDER_ONLY),
  /**
   * Provider used by the "provider outage" drill. The primary model is routed
   * only to this provider, which does not serve it, so Gateway falls through
   * to the first fallback model. Deterministic, no real outage required.
   */
  outageDrillProviderOnly: process.env.OUTAGE_DRILL_PROVIDER_ONLY || "bedrock",

  /** Agent loop bounds. */
  maxAgentSteps: 8,
  maxOutputTokens: 2200,
  modelRetries: 2,
  modelTimeoutMs: 60_000,

  /** Customer API call bounds (each tool call is a retried workflow step). */
  telemetryTimeoutMs: 5_000,
  telemetryRetries: 2,
  telemetryRetryAfter: "2s" as const,

  /** Where investigation runs live. Workflows pins the run to this region. */
  region: process.env.RELAY_REGION || "iad1",

  /** How long a run waits for a service owner before the proposal expires. */
  approvalTimeout: (process.env.APPROVAL_TIMEOUT || "15m") as `${number}${"s" | "m" | "h"}`,
  /** The redeploy drill holds the run this long before the model phase. */
  pauseSeconds: Number(process.env.DEMO_PAUSE_SECONDS || 30),

  /** Demo-only controls (fault injection, outage drill). */
  demoControls: process.env.DEMO_CONTROLS === "true" || process.env.NODE_ENV !== "production",

  /** Reviewer session lifetime. */
  sessionHours: 24,
};

export type Config = typeof config;
