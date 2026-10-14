import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.DEMO_URL || "http://127.0.0.1:3000";
const log: unknown[] = [];
async function run(
  fault: "none" | "transient" | "outage",
  scenario = "checkout",
) {
  const started = Date.now();
  const response = await fetch(`${base}/api/investigations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(base).origin,
    },
    body: JSON.stringify({ scenario, mode: "sample", fault }),
  });
  assert.equal(response.status, 202, await response.clone().text());
  const { runId, runToken } = await response.json();
  const denied = await fetch(`${base}/api/investigations/${runId}`);
  assert.equal(denied.status, 403);
  for (let i = 0; i < 80; i++) {
    const statusResponse = await fetch(`${base}/api/investigations/${runId}`, {
      headers: { "x-run-token": runToken },
    });
    assert.equal(
      statusResponse.status,
      200,
      await statusResponse.clone().text(),
    );
    const body = await statusResponse.json();
    if (body.status === "completed" || body.status === "failed") {
      assert.equal(body.status, fault === "outage" ? "failed" : "completed");
      if (fault !== "outage") {
        assert.equal(
          body.result.telemetry.retrievalAttempts,
          fault === "transient" ? 2 : 1,
        );
        assert.equal(body.result.mode, "sample");
        assert.equal(body.result.telemetry.model, null);
        assert.equal(body.result.validationVersion, 2);
        if (scenario === "network") {
          assert.equal(body.result.bundle.topology.nodes.length, 6);
          assert.equal(body.result.bundle.topology.handoffs.length, 3);
        }
        // Re-fetch with a fresh HTTP request to demonstrate persisted output access.
        const reconnected = await fetch(`${base}/api/investigations/${runId}`, {
          headers: { "x-run-token": runToken },
        });
        assert.deepEqual((await reconnected.json()).result, body.result);
      } else assert.equal(body.result, null);
      const item = {
        scenario,
        fault,
        status: body.status,
        runId,
        elapsedMs: Date.now() - started,
        attempts: body.result?.telemetry.retrievalAttempts ?? null,
        unauthorizedRead: "denied",
      };
      log.push(item);
      console.log(JSON.stringify(item));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Workflow did not settle: ${runId}`);
}
async function main() {
  await run("none");
  await run("none", "network");
  await run("transient", "provider");
  await run("outage");
  const invalid = await fetch(`${base}/api/investigations`, {
    method: "POST",
    body: '{"scenario":"unknown","mode":"sample"}',
  });
  assert.equal(invalid.status, 400);
  const crossOrigin = await fetch(`${base}/api/investigations`, {
    method: "POST",
    headers: { Origin: "https://untrusted.example" },
    body: '{"scenario":"checkout","mode":"sample"}',
  });
  assert.equal(crossOrigin.status, 403);
  await mkdir("artifacts", { recursive: true });
  await writeFile(
    `artifacts/${base.includes("127.0.0.1") ? "local" : "deployment"}-smoke.json`,
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        base,
        invalidInput: "rejected",
        crossOrigin: "rejected",
        results: log,
      },
      null,
      2,
    ) + "\n",
  );
}
void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
