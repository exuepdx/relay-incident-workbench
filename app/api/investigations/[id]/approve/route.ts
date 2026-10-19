import { cookies } from "next/headers";
import { resumeHook } from "workflow/api";
import { approvalDecisionSchema } from "@/lib/contracts";
import { allowedOrigin, sessionCookie, validSession } from "@/lib/access";
import { getStore } from "@/lib/store";

/**
 * A service owner's decision on a proposed mitigation. Resumes the paused
 * run through its hook. The hook token is read from the index; it is never
 * sent to the browser. In production this is the customer's approval system
 * calling back, authenticated with their identity provider.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!allowedOrigin(request)) return Response.json({ error: "Origin rejected" }, { status: 403 });
  const session = (await cookies()).get(sessionCookie)?.value;
  if (!validSession(session))
    return Response.json({ error: "Enter the reviewer access code to decide." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[\w-]{10,160}$/.test(id)) return Response.json({ error: "Investigation not found" }, { status: 404 });

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = approvalDecisionSchema.safeParse({ ...(body as object), by: "reviewer" });
  if (!parsed.success)
    return Response.json({ error: "Decision must be approved or declined, with an optional note." }, { status: 400 });

  const store = getStore();
  const record = await store.get(id);
  if (!record?.approval || record.approval.status !== "pending" || !record.approval.token) {
    return Response.json({ error: "This run is not waiting for a decision." }, { status: 409 });
  }
  try {
    await resumeHook(record.approval.token, parsed.data);
    return Response.json(
      { ok: true, decision: parsed.data.decision },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("approval_resume_failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Could not deliver the decision to the run. It may have expired." }, { status: 409 });
  }
}
