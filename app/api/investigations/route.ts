import { cookies } from "next/headers";
import { start } from "workflow/api";
import { investigate } from "@/workflows/investigate";
import { investigationInputSchema } from "@/lib/contracts";
import { allowedOrigin, sessionCookie, validSession } from "@/lib/access";
import { config } from "@/lib/config";
import { getStore } from "@/lib/store";

export const maxDuration = 30;

const noStore = { "Cache-Control": "no-store" };

/** Start an investigation. Gated by the reviewer session. */
export async function POST(request: Request) {
  if (!allowedOrigin(request)) return Response.json({ error: "Origin rejected" }, { status: 403 });
  const session = (await cookies()).get(sessionCookie)?.value;
  if (!validSession(session)) return Response.json({ error: "Enter the reviewer access code to start an investigation." }, { status: 401 });

  const body = await request.text();
  if (body.length > 1024) return Response.json({ error: "Request too large" }, { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = investigationInputSchema.safeParse(value);
  if (!input.success) return Response.json({ error: "Choose a known incident and a supported fault setting." }, { status: 400 });
  if (input.data.fault !== "none" && !config.demoControls) {
    return Response.json({ error: "Demo controls are disabled in this environment." }, { status: 403 });
  }

  try {
    const run = await start(investigate, [input.data], { region: config.region });
    await getStore().create({
      runId: run.runId,
      incidentId: input.data.incidentId,
      status: "running",
      fault: input.data.fault,
      createdAt: new Date().toISOString(),
      completedAt: null,
      model: null,
      costUsd: null,
      title: null,
      result: null,
    });
    return Response.json({ runId: run.runId }, { status: 202, headers: noStore });
  } catch (error) {
    console.error("investigation_start_failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Could not start the investigation. Please retry." }, { status: 503 });
  }
}

/** List recent investigations (the index, not the workflow). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const incidentId = url.searchParams.get("incident") ?? undefined;
  const rows = await getStore().list({ incidentId, limit: 12 });
  return Response.json({ store: getStore().kind, runs: rows }, { headers: noStore });
}
