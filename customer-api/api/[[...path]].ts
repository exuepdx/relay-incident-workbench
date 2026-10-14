import { handleTelemetry, type Dataset } from "../handler";
import data from "../data/incidents.json" with { type: "json" };

/** Vercel Function fallback for the customer API (use when AWS is unavailable). */
export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/api/, "");
  return handleTelemetry(new Request(url, { method: "GET", headers: request.headers }), {
    token: process.env.TELEMETRY_API_TOKEN,
    data: data as Dataset,
  });
}
export const POST = GET;
