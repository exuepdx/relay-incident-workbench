import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { generateText } from "ai";
import { config } from "../lib/config";
import { gatewayOptions, summarizeSteps, totals } from "../lib/gateway";

async function main() {
  const result = await generateText({
    model: config.model,
    prompt: "Reply with the single word: ready.",
    maxOutputTokens: 64,
    providerOptions: gatewayOptions("provider-outage"),
    timeout: config.modelTimeoutMs,
  });
  const steps = summarizeSteps(result.steps);
  const accounting = totals(steps);
  assert.ok(accounting.fallbackUsed, "Gateway must report a failed primary attempt");
  assert.ok(
    gatewayOptions("provider-outage").gateway.models?.includes(accounting.servedBy ?? ""),
    "Final model must be an explicitly configured drill candidate",
  );
  assert.ok(steps.some((s) => s.modelAttempts.some((a) => a.model === config.model && !a.success)));
  const artifact = {
    verifiedAt: new Date().toISOString(),
    mode: "live",
    requestedModel: config.model,
    routing: gatewayOptions("provider-outage"),
    ...accounting,
    modelSteps: steps,
  };
  await writeFile("artifacts/fallback-verification.json", JSON.stringify(artifact, null, 2) + "\n");
  console.log(`Verified fallback: ${config.model} → ${accounting.servedBy} · $${accounting.totalCostUsd}`);
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
