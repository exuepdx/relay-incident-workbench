import { registerOTel } from "@vercel/otel";
import { installFakeGatewayRedirect } from "./lib/fake-gateway";

/**
 * Observability for the application itself. @vercel/otel exports traces to
 * Vercel's tracing and, on Pro and Enterprise, to any OTLP drain configured
 * for the project (the customer's observability platform). The AI SDK emits
 * spans for every model and tool call under `relay.investigate`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    registerOTel({ serviceName: "relay" });
    if (installFakeGatewayRedirect()) {
      console.log(`[relay] AI Gateway traffic redirected to ${process.env.RELAY_FAKE_GATEWAY_URL} (offline harness)`);
    }
  }
}
