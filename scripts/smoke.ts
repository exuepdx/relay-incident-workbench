import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

/**
 * End-to-end smoke against a running app (local or deployed).
 *
 *   DEMO_URL=http://127.0.0.1:3000 DEMO_ACCESS_CODE=... npm run smoke
 *
 * Starts runs for the healthy path, abstention, the transient 503, the
 * provider-outage drill with an approved mitigation, a model override with a
 * declined mitigation, optionally the redeploy hold (SMOKE_PAUSE=1), and a
 * full outage. Follows the progress stream, checks the terminal status and
 * the stored result, and verifies the access gates. Locally this runs
 * against the fake Gateway; deployed it spends real Gateway credit.
 */
const base = process.env.DEMO_URL || "http://127.0.0.1:3000";
const code = process.env.DEMO_ACCESS_CODE || "local-dev-code";
const origin = new URL(base).origin;
const log: unknown[] = [];

// Vercel preview deployments with Deployment Protection accept an automation bypass header.
const bypass: Record<string, string> = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : {};
function http(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return fetch(`${base}${path}`, { ...init, headers: { ...bypass, ...(init.headers ?? {}) } });
}

type Result = {
  report: { assessment: string; findings: Array<{ citations: string[] }> };
  evidence: Array<{ id: string }>;
  accounting: {
    servedBy: string | null;
    fallbackUsed: boolean;
    totalCostUsd: string | null;
    modelSteps: Array<{ toolCalls: string[] }>;
  };
  approval?: { decision: string; by: string | null };
};
type Status = {
  status: string;
  result?: Result | null;
  record?: { approval?: { status: string; token?: string } | null } | null;
};
type Event = { type: string; tool?: string; status: string; attempt?: number };

async function session() {
  const denied = await http("/api/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ incidentId: "INC-0244" }),
  });
  assert.equal(denied.status, 401, "runs must require the reviewer session");
  const bad = await http("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ code: "wrong-code" }),
  });
  assert.equal(bad.status, 401);
  const login = await http("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ code }),
  });
  assert.equal(login.status, 200, await login.clone().text());
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  assert.match(login.headers.get("set-cookie") || "", /HttpOnly/i);
  return cookie;
}

async function run(
  cookie: string,
  incidentId: string,
  fault: string,
  expect: "completed" | "failed",
  options: { model?: string; approve?: "approved" | "declined" } = {},
) {
  const started = Date.now();
  const response = await http("/api/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    body: JSON.stringify({ incidentId, fault, ...(options.model ? { model: options.model } : {}) }),
  });
  assert.equal(response.status, 202, await response.clone().text());
  const { runId } = await response.json();

  const events: Event[] = [];
  const streamDone = (async () => {
    const r = await http(`/api/investigations/${runId}/events`);
    assert.equal(r.status, 200);
    const reader = r.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) if (l) events.push(JSON.parse(l));
      }
    } catch {
      /* stream closed */
    }
  })();

  let body: Status = { status: "pending" };
  let decided = false;
  for (let i = 0; i < 180; i++) {
    body = await (await http(`/api/investigations/${runId}`)).json();
    if (body.status === "completed" || body.status === "failed") break;
    if (body.record?.approval?.status === "pending" && !decided) {
      assert.equal(body.record.approval.token, undefined, "hook token must never reach the client");
      const unauth = await http(`/api/investigations/${runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({ decision: "approved" }),
      });
      assert.equal(unauth.status, 401, "approval must require the session");
      const r = await http(`/api/investigations/${runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
        body: JSON.stringify({ decision: options.approve ?? "approved", note: "smoke" }),
      });
      assert.equal(r.status, 202, await r.clone().text());
      decided = true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(body.status, expect, `${incidentId}/${fault}: ${JSON.stringify(body).slice(0, 300)}`);
  await Promise.race([streamDone, new Promise((r) => setTimeout(r, 2000))]);
  const result = body.result ?? null;

  if (expect === "completed") {
    assert.ok(result, "completed run must carry a result");
    const ids = new Set(result.evidence.map((e) => e.id));
    for (const f of result.report.findings)
      for (const c of f.citations) assert.ok(ids.has(c), `citation ${c} not in register`);
    const tools = result.accounting.modelSteps.flatMap((s) => s.toolCalls);
    for (const t of ["getServiceMetrics", "getSlowTraces", "getRecentChanges"])
      assert.ok(tools.includes(t), `tool ${t} not called`);
    if (incidentId === "INC-0243") assert.equal(result.report.assessment, "insufficient-evidence");
    if (fault === "transient")
      assert.ok(
        events.some((e) => e.type === "tool" && e.tool === "getSlowTraces" && e.attempt === 2),
        "transient fault must show a second attempt",
      );
    if (fault === "provider-outage") assert.equal(result.accounting.fallbackUsed, true, "drill must use the fallback");
    if (fault === "pause")
      assert.ok(
        events.some((e) => e.type === "pause" && e.status === "completed"),
        "pause drill must hold and resume",
      );
    if (options.model) assert.equal(result.accounting.servedBy, options.model, "model override must be honoured");
    if (options.approve) {
      assert.ok(decided, "a proposal was expected for this incident");
      assert.equal(result.approval?.decision, options.approve, "approval outcome must be recorded");
      assert.ok(
        events.some((e) => e.type === "approval" && e.status === options.approve),
        "approval event must stream",
      );
    }
    const again = await (await http(`/api/investigations/${runId}`)).json();
    assert.deepEqual(again.result, result, "stored result must be stable across reads");
  } else {
    assert.ok(
      events.some((e) => e.type === "tool" && e.status === "failed"),
      "outage must show a failed step",
    );
    assert.ok(!events.some((e) => e.type === "model"), "outage must not reach the model");
  }
  const item = {
    incidentId,
    fault,
    model: options.model ?? null,
    status: body.status,
    runId,
    elapsedMs: Date.now() - started,
    events: events.length,
    servedBy: result?.accounting.servedBy ?? null,
    fallbackUsed: result?.accounting.fallbackUsed ?? null,
    costUsd: result?.accounting.totalCostUsd ?? null,
    approval: result?.approval?.decision ?? null,
  };
  log.push(item);
  console.log(JSON.stringify(item));
}

async function main() {
  const cookie = await session();
  await run(cookie, "INC-0244", "none", "completed");
  await run(cookie, "INC-0243", "none", "completed");
  await run(cookie, "INC-0242", "transient", "completed");
  await run(cookie, "INC-0241", "provider-outage", "completed", { approve: "approved" });
  await run(cookie, "INC-0241", "none", "completed", {
    model: process.env.SMOKE_ALT_MODEL || "google/gemini-2.5-flash",
    approve: "declined",
  });
  if (process.env.SMOKE_PAUSE === "1") await run(cookie, "INC-0244", "pause", "completed");
  await run(cookie, "INC-0244", "outage", "failed");

  const list = await (await http("/api/investigations?incident=INC-0244")).json();
  assert.ok(list.runs.length >= 2, "index lists runs");
  const invalid = await http("/api/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    body: '{"incidentId":"nope"}',
  });
  assert.equal(invalid.status, 400);
  const badModel = await http("/api/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
    body: '{"incidentId":"INC-0244","model":"openai/not-allowed"}',
  });
  assert.equal(badModel.status, 400, "models outside the allow-list are rejected");
  const crossOrigin = await http("/api/investigations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://untrusted.example", Cookie: cookie },
    body: '{"incidentId":"INC-0244"}',
  });
  assert.equal(crossOrigin.status, 403);
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    `artifacts/${base.includes("127.0.0.1") ? "local" : "deployment"}-smoke.json`,
    JSON.stringify({ testedAt: new Date().toISOString(), base, store: list.store, results: log }, null, 2) + "\n",
  );
  console.log("smoke ok");
}
void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
