import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

/**
 * End-to-end smoke against a running app (local or deployed).
 *
 *   DEMO_URL=http://127.0.0.1:3000 DEMO_ACCESS_CODE=... npm run smoke
 *
 * Starts four runs (healthy, transient 503, provider-outage drill, outage),
 * follows the progress stream, checks the terminal status and the stored
 * result, and verifies the access gate. Locally this runs against the fake
 * Gateway; deployed it spends real Gateway credits (about $0.03).
 */
const base = process.env.DEMO_URL || "http://127.0.0.1:3000";
const code = process.env.DEMO_ACCESS_CODE || "local-dev-code";
const origin = new URL(base).origin;
const log: unknown[] = [];

async function session() {
  const denied = await fetch(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ incidentId: "INC-0244" }) });
  assert.equal(denied.status, 401, "runs must require the reviewer session");
  const bad = await fetch(`${base}/api/session`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ code: "wrong-code" }) });
  assert.equal(bad.status, 401);
  const login = await fetch(`${base}/api/session`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ code }) });
  assert.equal(login.status, 200, await login.clone().text());
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  assert.match(login.headers.get("set-cookie") || "", /HttpOnly/i);
  return cookie;
}

async function run(cookie: string, incidentId: string, fault: string, expect: "completed" | "failed") {
  const started = Date.now();
  const response = await fetch(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body: JSON.stringify({ incidentId, fault }) });
  assert.equal(response.status, 202, await response.clone().text());
  const { runId } = await response.json();
  const events: Array<{ type: string; tool?: string; status: string; attempt?: number }> = [];
  const streamDone = (async () => {
    const r = await fetch(`${base}/api/investigations/${runId}/events`);
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
      /* aborted below */
    }
  })();
  let body: { status: string; result?: Record<string, never> | null } = { status: "pending" };
  for (let i = 0; i < 120; i++) {
    body = await (await fetch(`${base}/api/investigations/${runId}`)).json();
    if (body.status === "completed" || body.status === "failed") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(body.status, expect, `${incidentId}/${fault}: ${JSON.stringify(body).slice(0, 300)}`);
  await Promise.race([streamDone, new Promise((r) => setTimeout(r, 1500))]);
  const result = (body.result ?? null) as null | { report: { assessment: string; findings: Array<{ citations: string[] }> }; evidence: Array<{ id: string }>; accounting: { servedBy: string | null; fallbackUsed: boolean; totalCostUsd: string | null; modelSteps: Array<{ toolCalls: string[] }> } };
  if (expect === "completed") {
    assert.ok(result, "completed run must carry a result");
    const ids = new Set(result.evidence.map((e) => e.id));
    for (const f of result.report.findings) for (const c of f.citations) assert.ok(ids.has(c), `citation ${c} not in register`);
    const tools = result.accounting.modelSteps.flatMap((s) => s.toolCalls);
    for (const t of ["getServiceMetrics", "getSlowTraces", "getRecentChanges"]) assert.ok(tools.includes(t), `tool ${t} not called`);
    if (incidentId === "INC-0243") assert.equal(result.report.assessment, "insufficient-evidence");
    if (fault === "transient") assert.ok(events.some((e) => e.type === "tool" && e.tool === "getSlowTraces" && e.attempt === 2), "transient fault must show a second attempt");
    if (fault === "provider-outage") assert.equal(result.accounting.fallbackUsed, true, "drill must use the fallback");
    const again = await (await fetch(`${base}/api/investigations/${runId}`)).json();
    assert.deepEqual(again.result, result, "stored result must be stable across reads");
  } else {
    assert.ok(events.some((e) => e.type === "tool" && e.status === "failed"), "outage must show a failed step");
    assert.ok(!events.some((e) => e.type === "model"), "outage must not reach the model");
  }
  const item = { incidentId, fault, status: body.status, runId, elapsedMs: Date.now() - started, events: events.length, servedBy: result?.accounting.servedBy ?? null, fallbackUsed: result?.accounting.fallbackUsed ?? null, costUsd: result?.accounting.totalCostUsd ?? null };
  log.push(item);
  console.log(JSON.stringify(item));
}

async function main() {
  const cookie = await session();
  await run(cookie, "INC-0244", "none", "completed");
  await run(cookie, "INC-0243", "none", "completed");
  await run(cookie, "INC-0242", "transient", "completed");
  await run(cookie, "INC-0241", "provider-outage", "completed");
  await run(cookie, "INC-0244", "outage", "failed");
  const list = await (await fetch(`${base}/api/investigations?incident=INC-0244`)).json();
  assert.ok(list.runs.length >= 2, "index lists runs");
  const invalid = await fetch(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body: '{"incidentId":"nope"}' });
  assert.equal(invalid.status, 400);
  const crossOrigin = await fetch(`${base}/api/investigations`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://untrusted.example", Cookie: cookie }, body: '{"incidentId":"INC-0244"}' });
  assert.equal(crossOrigin.status, 403);
  await mkdir("artifacts", { recursive: true });
  await writeFile(`artifacts/${base.includes("127.0.0.1") ? "local" : "deployment"}-smoke.json`, JSON.stringify({ testedAt: new Date().toISOString(), base, store: list.store, results: log }, null, 2) + "\n");
  console.log("smoke ok");
}
void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
