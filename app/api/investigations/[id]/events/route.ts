import { getRun } from "workflow/api";
import type { ProgressEvent } from "@/lib/contracts";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

/**
 * The run's progress stream as newline-delimited JSON. Chunks are persisted
 * by Workflows, so a client that reconnects replays from the start (or from
 * `?from=<index>`) and sees the same timeline. The response closes shortly
 * after the run reaches a terminal state.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[\w-]{10,160}$/.test(id)) return new Response("not found", { status: 404 });
  const from = Number(new URL(request.url).searchParams.get("from") ?? "0");
  const run = getRun(id);
  if (!(await run.exists)) return new Response("not found", { status: 404 });
  const source = run.getReadable<ProgressEvent>({ namespace: "progress", startIndex: Number.isFinite(from) ? from : 0 });
  const reader = source.getReader();
  const encoder = new TextEncoder();
  let closed = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Watch the run; once it is terminal, allow a moment for the final chunks and close.
      const watcher = (async () => {
        while (!closed) {
          if (TERMINAL.has(await run.status)) {
            await new Promise((r) => setTimeout(r, 1200));
            if (!closed) {
              closed = true;
              await reader.cancel().catch(() => {});
              try {
                controller.close();
              } catch {
                /* already closed */
              }
            }
            return;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
      })();
      try {
        while (!closed) {
          const { value, done } = await reader.read();
          if (done || closed) break;
          controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
        }
      } catch {
        /* reader cancelled by the watcher */
      }
      closed = true;
      await watcher.catch(() => {});
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      closed = true;
      void reader.cancel().catch(() => {});
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
