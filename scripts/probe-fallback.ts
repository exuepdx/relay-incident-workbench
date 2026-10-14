import { generateText } from "ai";
import { config } from "../lib/config";
import { gatewayOptions } from "../lib/gateway";

/**
 * Verifies the provider-outage drill before a live demo: the primary model is
 * routed only to a provider that does not serve it, and Gateway must fall
 * back to the first fallback model. Prints the model attempts.
 *
 *   npm run probe:fallback
 */
async function main() {
  const providerOptions = gatewayOptions("provider-outage");
  console.log("primary", config.model, "routing", JSON.stringify(providerOptions.gateway));
  const result = await generateText({
    model: config.model,
    prompt: "Reply with the single word: ready.",
    maxOutputTokens: 20,
    providerOptions,
  });
  const gateway = result.providerMetadata?.gateway as Record<string, unknown> | undefined;
  console.log("served by", result.response.modelId);
  console.log("attempts", JSON.stringify(gateway?.modelAttempts ?? "(no modelAttempts in metadata)", null, 2));
  console.log("cost", gateway?.cost, "text", result.text.trim());
}
void main().catch((error) => {
  console.error("probe failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
