import { getRun } from "workflow/api";
import { canReadRun } from "@/lib/access";
import type { InvestigationResult } from "@/lib/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (
    !/^[\w-]{10,160}$/.test(id) ||
    !canReadRun(id, request.headers.get("x-run-token") || "")
  ) {
    return Response.json(
      { error: "Investigation access denied" },
      { status: 403 },
    );
  }
  try {
    const run = getRun<InvestigationResult>(id);
    if (!(await run.exists))
      return Response.json(
        { error: "Investigation not found or no longer retained" },
        { status: 404 },
      );
    const status = await run.status;
    // Never await returnValue for a running workflow: the HTTP request stays short.
    const result = status === "completed" ? await run.returnValue : null;
    return Response.json(
      { status, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not read investigation status" },
      { status: 503 },
    );
  }
}
