import { installFakeGatewayRedirect } from "./lib/fake-gateway";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && installFakeGatewayRedirect()) {
    console.log(`[relay] AI Gateway traffic redirected to ${process.env.RELAY_FAKE_GATEWAY_URL} (offline harness)`);
  }
}
