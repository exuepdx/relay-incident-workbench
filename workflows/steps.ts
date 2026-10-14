import { FatalError, RetryableError, getStepMetadata } from "workflow";
import {
  bundleSchema,
  validateReport,
  type Bundle,
  type InvestigationInput,
  type InvestigationResult,
} from "@/lib/contracts";
import { samples } from "@/lib/samples";
import { analyzeBundle } from "@/lib/analysis";

export async function collectEvidence(input: InvestigationInput) {
  "use step";
  const started = Date.now();
  const { attempt } = getStepMetadata();
  const api = process.env.TELEMETRY_API_URL;
  const token = process.env.TELEMETRY_API_TOKEN;
  if (!api || !token)
    throw new FatalError("Telemetry integration is not configured");
  const url = new URL(api);
  // The destination is server configuration, never a model- or user-supplied URL.
  if (
    url.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && url.hostname === "127.0.0.1")
  ) {
    throw new FatalError("Telemetry endpoint must use HTTPS");
  }
  url.searchParams.set("scenario", input.scenario);
  const fail =
    input.fault === "outage" || (input.fault === "transient" && attempt === 1);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-relay-evidence-version": "2",
        ...(fail ? { "x-demo-fault": "unavailable" } : {}),
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new RetryableError("Telemetry connection unavailable", {
      retryAfter: "2s",
    });
  }
  if (response.status >= 500 || response.status === 429)
    throw new RetryableError("Telemetry service unavailable", {
      retryAfter: "2s",
    });
  if (!response.ok)
    throw new FatalError(`Telemetry request rejected (${response.status})`);
  const text = await response.text();
  if (text.length > 32000)
    throw new FatalError("Telemetry response exceeds the evidence budget");
  const parsed = bundleSchema.safeParse(JSON.parse(text));
  if (!parsed.success || parsed.data.scenario !== input.scenario)
    throw new FatalError("Telemetry contract mismatch");
  return {
    bundle: parsed.data,
    retrievalMs: Date.now() - started,
    retrievalAttempts: attempt,
    startedAt: new Date(started).toISOString(),
  };
}
collectEvidence.maxRetries = 2;

export async function synthesizeReport(
  bundle: Bundle,
  mode: InvestigationInput["mode"],
) {
  "use step";
  if (mode === "sample")
    return {
      report: validateReport(samples[bundle.scenario], bundle),
      modelMs: 0,
      model: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: null,
      gatewayRequestId: null,
    };
  if (process.env.ENABLE_LIVE_AI !== "true")
    throw new FatalError("Live AI is not enabled");
  // SDK and step retries are disabled for inference: a lost response may still be billed.
  // Retrieval can retry safely; a reviewer explicitly starts another model attempt.
  return analyzeBundle(bundle);
}
synthesizeReport.maxRetries = 0;

export async function finalizeReport(
  input: InvestigationInput,
  collected: Awaited<ReturnType<typeof collectEvidence>>,
  analyzed: Awaited<ReturnType<typeof synthesizeReport>>,
): Promise<InvestigationResult> {
  "use step";
  const { report, ...accounting } = analyzed;
  const { bundle, ...retrieval } = collected;
  return {
    schemaVersion: 1,
    validationVersion: 2,
    scenario: input.scenario,
    mode: input.mode,
    report,
    bundle,
    telemetry: {
      ...retrieval,
      ...accounting,
      completedAt: new Date().toISOString(),
    },
  };
}
