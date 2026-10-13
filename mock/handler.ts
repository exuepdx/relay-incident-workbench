import { timingSafeEqual } from "node:crypto";
import data from "./data.json" with { type: "json" };

export function handleTelemetry(
  request: Request,
  token: string | undefined,
): Response {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
  if (!token)
    return Response.json(
      { error: "Service not configured" },
      { status: 503, headers },
    );
  const expected = Buffer.from(`Bearer ${token}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  if (request.method !== "GET")
    return Response.json({ error: "Read only" }, { status: 405, headers });
  const url = new URL(request.url);
  const scenario = url.searchParams.get("scenario") ?? "";
  if (!Object.hasOwn(data, scenario))
    return Response.json(
      { error: "Unknown scenario" },
      { status: 404, headers },
    );
  // Fault injection is confined to this synthetic service and requires the same auth.
  if (request.headers.get("x-demo-fault") === "unavailable") {
    return Response.json(
      { error: "Simulated telemetry outage" },
      { status: 503, headers },
    );
  }
  return Response.json(data[scenario as keyof typeof data], { headers });
}
