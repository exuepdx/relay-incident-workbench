import { getRun } from "workflow/api";
import type { InvestigationResult } from "@/lib/contracts";
import { getStore } from "@/lib/store";

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
  const store = getStore();
  const record = await store.get(id);
  if (record?.status === "completed" && record.result) {
    return Response.json({ status: "completed", record, result: record.result }, { headers: noStore });
  }
  try {
    const run = getRun<InvestigationResult>(id);
    if (!(await run.exists)) {
      if (record) return Response.json({ status: record.status, record, result: null, retained: false }, { headers: noStore });
      return Response.json({ error: "Investigation not found or no longer retained" }, { status: 404 });
    }
    const status = await run.status;
    // Never await returnValue for a running workflow: keep the request short.
    const result = status === "completed" ? await run.returnValue : null;
    if (result && record && !record.result) {
      await store.update(id, { status: "completed", result, title: result.report.title, model: result.accounting.servedBy, costUsd: result.accounting.totalCostUsd, completedAt: result.accounting.completedAt });
    }
    return Response.json({ status, record: record ?? null, result }, { headers: noStore });
  } catch (error) {
    console.error("investigation_read_failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Could not read investigation status" }, { status: 503 });
  }
}
