/**
 * Test-only redirect of AI Gateway traffic to a local fake (scripts/fake-gateway.ts).
 *
 * The Gateway client always talks to https://ai-gateway.vercel.sh. Rather than
 * threading a base URL through the workflow (model instances with async auth
 * headers do not serialize across steps), the offline harness rewrites the
 * host at the fetch layer. Never active in production.
 */
export function installFakeGatewayRedirect() {
  const target = process.env.RELAY_FAKE_GATEWAY_URL;
  if (!target || process.env.NODE_ENV === "production") return false;
  const g = globalThis as typeof globalThis & { __relayFakeGateway?: boolean };
  if (g.__relayFakeGateway) return true;
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://ai-gateway.vercel.sh/")) {
      const rewritten = url.replace("https://ai-gateway.vercel.sh", target.replace(/\/$/, ""));
      return original(rewritten, init);
    }
    return original(input as RequestInfo, init);
  };
  g.__relayFakeGateway = true;
  return true;
}
