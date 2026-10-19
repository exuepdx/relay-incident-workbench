import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { start } from "workflow/api";
import { investigate } from "@/workflows/investigate";
import { investigationInputSchema } from "@/lib/contracts";
import { allowedOrigin, sessionCookie, validSession } from "@/lib/access";
import { config } from "@/lib/config";
import { getStore } from "@/lib/store";
import "@/lib/store-postgres";

export const maxDuration = 30;

const noStore = { "Cache-Control": "no-store" };

/** Start an investigation. Gated by the reviewer session. */
export async function POST(request: Request) {
  if (!allowedOrigin(request)) return Response.json({ error: "Origin rejected" }, { status: 403 });
  const session = (await cookies()).get(sessionCookie)?.value;
  if (!validSession(session))
    return Response.json({ error: "Enter the reviewer access code to start an investigation." }, { status: 401 });

  const body = await request.text();
  if (body.length > 1024) return Response.json({ error: "Request too large" }, { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = investigationInputSchema.safeParse(value);
  if (!input.success)
    return Response.json({ error: "Choose a known incident and a supported fault setting." }, { status: 400 });
  if (input.data.fault !== "none" && !config.demoControls) {
    return Response.json({ error: "Demo controls are disabled in this environment." }, { status: 403 });
  }
  if (input.data.model && input.data.model !== config.model && !config.comparisonModels.includes(input.data.model)) {
    return Response.json({ error: "That model is not on the comparison allow-list." }, { status: 400 });
  }

  const requestKey = request.headers.get("Idempotency-Key") ?? randomUUID();
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey))
    return Response.json({ error: "Invalid request key" }, { status: 400 });
  try {
    const store = getStore();
    const fingerprint = createHash("sha256").update(JSON.stringify(input.data)).digest("hex");
    const reservation = await store.claimStart(requestKey, fingerprint);
    if (!reservation.created) {
      return Response.json(
        {
          runId: reservation.runId,
          requestKey,
          ...(reservation.runId
            ? {}
            : {
                error: "Start is not confirmed yet. Retry with the same request key; no second run will be dispatched.",
              }),
        },
        { status: reservation.runId ? 202 : 409, headers: noStore },
      );
    }
    const run = await start(investigate, [input.data, requestKey], { region: config.region });
    // The workflow registers its own index before inference. Never turn a
    // successful dispatch into a retry that creates another paid run.
    try {
      await store.bindStart(requestKey, run.runId);
    } catch (error) {
      console.error("start_index_pending", error instanceof Error ? error.message : "storage error");
    }
    return Response.json({ runId: run.runId, requestKey }, { status: 202, headers: noStore });
  } catch (error) {
    console.error("investigation_start_failed", error instanceof Error ? error.message : error);
    return Response.json(
      {
        requestKey,
        error:
          "Start could not be confirmed. Retry with the same request key; check saved runs before starting another investigation.",
      },
      { status: 503, headers: noStore },
    );
  }
}

/** List recent investigations (the index, not the workflow). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const incidentId = url.searchParams.get("incident") ?? undefined;
  try {
    const store = getStore();
    const rows = await store.list({ incidentId, limit: 12 });
    return Response.json({ store: store.kind, runs: rows }, { headers: noStore });
  } catch (error) {
    console.error("investigation_list_unavailable", error instanceof Error ? error.message : "storage error");
    return Response.json(
      { error: "Saved investigations are temporarily unavailable." },
      { status: 503, headers: noStore },
    );
  }
}
