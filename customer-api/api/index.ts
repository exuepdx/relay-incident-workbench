import { handleTelemetry as legacyTelemetry } from "../legacy/handler.js";
import { handleTelemetry, type Dataset } from "../handler.js";
import data from "../data/incidents.json" with { type: "json" };

/** Vercel Function fallback for the customer API (use when AWS is unavailable). */
export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/api/, "");
  if (url.pathname === "/telemetry") return legacyTelemetry(request, process.env.TELEMETRY_API_TOKEN);
  return handleTelemetry(new Request(url, { method: request.method, headers: request.headers }), {
    token: process.env.TELEMETRY_API_TOKEN,
    data: data as Dataset,
  });
}
export const POST = GET;
