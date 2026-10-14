import { getRun } from "workflow/api";
import type { ProgressEvent } from "@/lib/contracts";

/**
 * The run's progress stream as newline-delimited JSON. Chunks are persisted
 * by Workflows, so a client that reconnects replays from the start (or from
 * `?from=<index>`) and sees the same timeline.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[\w-]{10,160}$/.test(id)) return new Response("not found", { status: 404 });
  const from = Number(new URL(request.url).searchParams.get("from") ?? "0");
  const run = getRun(id);
  if (!(await run.exists)) return new Response("not found", { status: 404 });
  const source = run.getReadable<ProgressEvent>({ namespace: "progress", startIndex: Number.isFinite(from) ? from : 0 });
  const encoder = new TextEncoder();
  const ndjson = source.pipeThrough(
    new TransformStream<ProgressEvent, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
      },
    }),
  );
  return new Response(ndjson, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
