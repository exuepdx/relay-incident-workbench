/**
 * Test-only redirect of AI Gateway traffic to a local fake (scripts/fake-gateway.ts).
 *
 * The Gateway client always talks to https://ai-gateway.vercel.sh. Rather than
 * threading a base URL through the workflow (model instances with async auth
 * headers do not serialize across steps), the offline harness rewrites the
 * host at the fetch layer. Next.js re-patches global fetch on hot reloads, so
 * the wrapper is re-asserted from the workflow steps before each call.
 * Never active in production.
 */
type Wrapped = typeof fetch & { __relayFakeGateway?: true };

export function installFakeGatewayRedirect() {
  const target = process.env.RELAY_FAKE_GATEWAY_URL;
  if (!target || process.env.NODE_ENV === "production") return false;
  const current = globalThis.fetch as Wrapped;
  if (current.__relayFakeGateway) return true;
  const original = current;
  const wrapped: Wrapped = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://ai-gateway.vercel.sh/")) {
      return original(url.replace("https://ai-gateway.vercel.sh", target.replace(/\/$/, "")), init);
    }
    return original(input as RequestInfo, init);
  };
  wrapped.__relayFakeGateway = true;
  globalThis.fetch = wrapped;
  return true;
}
