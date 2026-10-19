import { createServer } from "node:http";
import { readFileSync } from "node:fs";

/**
 * A fake AI Gateway for offline tests of the whole pipeline (workflow steps,
 * tool loop, validation, persistence, UI). It speaks the Gateway language
 * model protocol just enough for a non-streaming generate call:
 *
 *   phase 1: no tool results in the prompt → call all three tools
 *   phase 2: tool results present → return a canned report that cites the
 *            evidence ids actually returned by the tools
 *
 * The provider-outage drill is honoured: when providerOptions.gateway.only
 * names a provider that does not serve the primary, the response reports a
 * failed primary attempt and a successful fallback, like the real Gateway.
 */
const port = Number(process.env.PORT || 4321);
const served: Record<string, string[]> = {
  bedrock: ["anthropic/"],
  openai: ["openai/"],
  anthropic: ["anthropic/"],
  google: ["google/"],
  vertex: ["google/"],
};
const canned = JSON.parse(readFileSync(new URL("./fake-reports.json", import.meta.url), "utf8")) as Record<
  string,
  unknown
>;

type Part = { type: string; toolName?: string; text?: string; output?: { value?: unknown } };
type Msg = { role: string; content: string | Part[] };

function idsIn(value: unknown): string[] {
  const text = JSON.stringify(value) ?? "";
  return [...new Set(text.match(/"id":"(E\d+)"/g)?.map((m) => m.slice(6, -1)) ?? [])];
}

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!req.url?.endsWith("/language-model") || req.method !== "POST") {
    res.writeHead(404, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: { message: "not found" } }));
  }
  if (!/^Bearer /.test(req.headers.authorization ?? "")) {
    res.writeHead(401, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: { message: "missing bearer" } }));
  }
  const body = JSON.parse(raw) as {
    prompt: Msg[];
    providerOptions?: { gateway?: { only?: string[]; models?: string[] } };
  };
  const requested = String(req.headers["ai-language-model-id"] ?? "unknown/model");
  const only = body.providerOptions?.gateway?.only ?? [];
  const fallbacks = body.providerOptions?.gateway?.models ?? [];
  const primaryServed =
    only.length === 0 || only.some((p) => (served[p] ?? []).some((prefix) => requested.startsWith(prefix)));
  const servedBy = primaryServed
    ? requested
    : (fallbacks.find((m) => only.some((p) => (served[p] ?? []).some((prefix) => m.startsWith(prefix)))) ??
      fallbacks[0] ??
      requested);
  const modelAttempts = primaryServed
    ? [
        {
          canonicalSlug: requested,
          modelId: `${only[0] ?? "openai"}:${requested.split("/")[1]}`,
          success: true,
          providerAttemptCount: 1,
          providerAttempts: [
            { attemptNumber: 1, provider: only[0] ?? requested.split("/")[0], success: true, statusCode: 200 },
          ],
        },
      ]
    : [
        {
          canonicalSlug: requested,
          modelId: `${only[0]}:${requested.split("/")[1]}`,
          success: false,
          providerAttemptCount: 1,
          providerAttempts: [
            {
              attemptNumber: 1,
              provider: only[0],
              success: false,
              statusCode: 404,
              error: `No provider in [${only.join(",")}] serves ${requested}`,
            },
          ],
        },
        {
          canonicalSlug: servedBy,
          modelId: `${only[0]}:${servedBy.split("/")[1]}`,
          success: true,
          providerAttemptCount: 1,
          providerAttempts: [{ attemptNumber: 1, provider: only[0], success: true, statusCode: 200 }],
        },
      ];

  const toolResults = body.prompt.flatMap((m) =>
    Array.isArray(m.content) ? m.content.filter((p) => p.type === "tool-result") : [],
  );
  const called = new Set(toolResults.map((p) => p.toolName));
  const userText = body.prompt
    .flatMap((m) =>
      m.role === "user" && Array.isArray(m.content)
        ? m.content.map((p) => p.text ?? "")
        : typeof m.content === "string"
          ? [m.content]
          : [],
    )
    .join("\n");
  const incidentId = /INC-\d{4}/.exec(userText)?.[0] ?? "INC-0244";
  const wanted = ["getServiceMetrics", "getSlowTraces", "getRecentChanges"].filter((t) => !called.has(t));
  // The pool-contention incident earns a mitigation proposal (human approval path).
  const wantsProposal = incidentId === "INC-0241" && !wanted.length && !called.has("proposeMitigation");

  let content: unknown[];
  let finish: string;
  if (wanted.length) {
    content = wanted.map((toolName, i) => ({
      type: "tool-call",
      toolCallId: `call_${Date.now()}_${i}`,
      toolName,
      input: "{}",
    }));
    finish = "tool-calls";
  } else if (wantsProposal) {
    content = [
      {
        type: "tool-call",
        toolCallId: `call_${Date.now()}_p`,
        toolName: "proposeMitigation",
        input: JSON.stringify({
          action: "Revert the inventory client connection pool maximum from 5 back to 20 (release 8f2c1d)",
          owner: "Inventory Services",
          rationale:
            "Pool waits dominate the slow traces and pending requests rose from 0 to 84 after the pool maximum dropped from 20 to 5 at 14:12; database CPU stayed near baseline, so restoring the previous limit is the lowest-risk reversible change.",
          expectedEffect: "db.pool.acquire waits fall back toward baseline and checkout p95 recovers; if not, the hypothesis is wrong and the change is reverted again.",
          citations: ["E2", "E3", "E4"],
        }),
      },
    ];
    finish = "tool-calls";
  } else {
    const available = new Set([...idsIn(toolResults.map((p) => p.output?.value)), ...idsIn(userText)]);
    const report = structuredClone(canned[incidentId] ?? canned["INC-0244"]) as {
      findings: Array<{ citations: string[] }>;
    };
    for (const f of report.findings) f.citations = f.citations.filter((id) => available.has(id));
    for (const f of report.findings) if (!f.citations.length) f.citations = [[...available][0] ?? "E1"];
    content = [{ type: "text", text: JSON.stringify(report) }];
    finish = "stop";
  }
  await new Promise((r) => setTimeout(r, Number(process.env.FAKE_LATENCY_MS || 600)));
  const response = {
    content,
    finishReason: { unified: finish, raw: finish },
    usage: {
      inputTokens: {
        total: 1400 + toolResults.length * 300,
        noCache: undefined,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: wanted.length ? 60 : 520, text: undefined, reasoning: undefined },
    },
    providerMetadata: {
      gateway: {
        cost: wanted.length ? "0.0021" : "0.0094",
        generationId: `gen_fake_${Math.random().toString(36).slice(2, 10)}`,
        routing: { finalProvider: only[0] ?? "openai" },
        modelAttempts,
      },
    },
    response: { id: `resp_${Date.now()}`, modelId: servedBy, timestamp: new Date().toISOString() },
    warnings: [],
  };
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(response));
}).listen(port, "127.0.0.1", () =>
  console.log(
    `Fake AI Gateway (offline harness): http://127.0.0.1:${port}  (set RELAY_FAKE_GATEWAY_URL=http://127.0.0.1:${port})`,
  ),
);
