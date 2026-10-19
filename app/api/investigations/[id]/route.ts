import { getRun } from "workflow/api";
import type { InvestigationResult } from "@/lib/contracts";
import { getStore } from "@/lib/store";
import "@/lib/store-postgres";

const noStore = { "Cache-Control": "no-store" };
const validId = (id: string) => /^[\w-]{10,160}$/.test(id);

/**
 * Status and result for one run. The index is the source of truth once a run
 * is finalized (it outlives Workflows' retention); the workflow is consulted
 * while a run is in flight or when the index has no copy.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!validId(id)) return Response.json({ error: "Investigation not found" }, { status: 404 });
  let store;
  let stored;
  try {
    store = getStore();
    stored = await store.get(id);
  } catch (error) {
    console.error("investigation_index_unavailable", error instanceof Error ? error.message : "storage error");
    return Response.json(
      { error: "Saved investigation storage is temporarily unavailable. Retry this run link." },
      { status: 503, headers: noStore },
    );
  }
  // The hook token stays server-side.
  const record = stored
    ? { ...stored, approval: stored.approval ? { ...stored.approval, token: undefined } : stored.approval }
    : null;
  if (record?.status === "completed" && record.result) {
    return Response.json({ status: "completed", record, result: record.result }, { headers: noStore });
  }
  try {
    const run = getRun<InvestigationResult>(id);
    if (!(await run.exists)) {
      if (record)
        return Response.json({ status: record.status, record, result: null, retained: false }, { headers: noStore });
      return Response.json({ error: "Investigation not found or no longer retained" }, { status: 404 });
    }
    const status = await run.status;
    // Never await returnValue for a running workflow: keep the request short.
    const result = status === "completed" ? await run.returnValue : null;
    if ((status === "failed" || status === "cancelled") && record?.status === "running") {
      await store.update(id, { status: "failed", completedAt: new Date().toISOString() });
      record.status = "failed";
    }
    if (result && record && !record.result) {
      await store.update(id, {
        status: "completed",
        result,
        title: result.report.title,
        model: result.accounting.servedBy,
        costUsd: result.accounting.totalCostUsd,
        completedAt: result.accounting.completedAt,
      });
    }
    return Response.json({ status, record: record ?? null, result }, { headers: noStore });
  } catch (error) {
    console.error("investigation_read_failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Could not read investigation status" }, { status: 503 });
  }
}
