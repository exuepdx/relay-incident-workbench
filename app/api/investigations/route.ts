import { cookies } from "next/headers";
import { start } from "workflow/api";
import { investigate } from "@/workflows/investigate";
import { requestSchema } from "@/lib/contracts";
import { signRun, validSession } from "@/lib/access";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origin rejected" }, { status: 403 });
  const body = await request.text();
  if (body.length > 1024) return Response.json({ error: "Request too large" }, { status: 413 });
  let value: unknown;
  try { value = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const input = requestSchema.safeParse(value);
  if (!input.success) return Response.json({ error: "Choose a supported incident, mode, and fault setting" }, { status: 400 });
  if (input.data.mode === "live") {
    if (process.env.ENABLE_LIVE_AI !== "true") return Response.json({ error: "Live AI is not configured. Use the clearly labeled sample mode." }, { status: 503 });
    const session = (await cookies()).get("relay-reviewer")?.value ?? "";
    if (!validSession(session)) return Response.json({ error: "Enter the reviewer access code to run live AI" }, { status: 401 });
  }
  try {
    const run = await start(investigate, [input.data]);
    return Response.json({ runId: run.runId, runToken: signRun(run.runId) }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("investigation_start_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "Could not start the investigation. Please retry." }, { status: 503 });
  }
}
