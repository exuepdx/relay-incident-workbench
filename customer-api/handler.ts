import { timingSafeEqual } from "node:crypto";

/**
 * Northstar's telemetry API.
 *
 * This service stands in for the customer's existing observability platform.
 * It is deliberately framework-free: the same handler runs locally, on an AWS
 * Lambda function URL (the primary deployment), or on Vercel as a fallback.
 *
 * Read-only. Bearer authenticated. Synthetic data. The `x-demo-fault` header
 * lets the demo rehearse a 503 from the customer side without touching the app.
 */

export type EvidenceKind = "metric" | "trace" | "change" | "coverage";
export type EvidenceItem = { id: string; kind: EvidenceKind; title: string; detail: string; source: string };
export type IncidentRecord = {
  id: string;
  title: string;
  short: string;
  subtitle: string;
  question: string;
  severity: string;
  window: string;
  services: string[];
  owners?: string[];
  kpis: { p95Ms: number; baselineMs: number; errorRatePct: number; change: string };
  series: number[];
  spans: Array<{ name: string; service: string; start: number; duration: number; color: string }>;
  evidence: EvidenceItem[];
  topology?: unknown;
  reportPolicy: { singleObservedHttpCodes?: number[]; diagnosis?: "hypothesis-permitted" | "withhold" };
};
export type Dataset = Record<string, IncidentRecord>;

export type HandlerEnv = { token: string | undefined; data: Dataset };

const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

function authorized(request: Request, token: string) {
  const expected = Buffer.from(`Bearer ${token}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function handleTelemetry(request: Request, env: HandlerEnv): Response {
  if (!env.token) return json({ error: "Service not configured" }, 503);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/health")
    return json({ ok: true, service: "northstar-telemetry", incidents: Object.keys(env.data).length });
  if (!authorized(request, env.token)) return json({ error: "Unauthorized" }, 401);
  if (request.method !== "GET") return json({ error: "Read only" }, 405);
  // Fault injection is confined to this synthetic service and requires auth.
  if (request.headers.get("x-demo-fault") === "unavailable") return json({ error: "Simulated telemetry outage" }, 503);

  if (path === "/incidents") {
    return json(
      Object.values(env.data).map((i) => ({
        id: i.id,
        short: i.short,
        title: i.title,
        severity: i.severity,
        window: i.window,
      })),
    );
  }
  const match = /^\/incidents\/(INC-\d{4})(?:\/(metrics|traces|changes|evidence))?$/.exec(path);
  if (!match) return json({ error: "Not found" }, 404);
  const [, id, resource] = match;
  if (!Object.hasOwn(env.data, id)) return json({ error: "Unknown incident" }, 404);
  const incident = env.data[id];

  if (!resource) {
    // UI record includes chart measurements. lib/agent.ts deliberately selects
    // only context and coverage for the model briefing; tools supply its measurements.
    const { evidence, ...rest } = incident;
    return json({ ...rest, coverage: evidence.filter((e) => e.kind === "coverage") });
  }
  const kind =
    resource === "metrics" ? "metric" : resource === "traces" ? "trace" : resource === "changes" ? "change" : "all";
  const evidence = kind === "all" ? incident.evidence : incident.evidence.filter((e) => e.kind === kind);
  return json({ incidentId: id, kind, evidence });
}
