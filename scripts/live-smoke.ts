import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { bundleSchema, validateReport } from "../lib/contracts";

const base = process.env.DEMO_URL || "http://127.0.0.1:3000";
const code = process.env.DEMO_ACCESS_CODE;
const headers = {
  "Content-Type": "application/json",
  Origin: new URL(base).origin,
};
const results: unknown[] = [];

async function main() {
  assert.ok(code, "Provide DEMO_ACCESS_CODE through the environment");
  const flags = await (await fetch(`${base}/api/session`)).json();
  assert.equal(flags.liveEnabled, true);
  assert.equal(flags.authenticated, false);
  const denied = await fetch(`${base}/api/investigations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ scenario: "checkout", mode: "live" }),
  });
  assert.equal(denied.status, 401);
  const invalid = await fetch(`${base}/api/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "invalid-test-code" }),
  });
  assert.equal(invalid.status, 401);
  const login = await fetch(`${base}/api/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });
  assert.equal(login.status, 200);
  const rawCookie = login.headers.get("set-cookie") || "";
  assert.match(rawCookie, /HttpOnly/i);
  assert.match(rawCookie, /SameSite=strict/i);
  if (base.startsWith("https:")) assert.match(rawCookie, /Secure/i);
  const cookie = rawCookie.split(";")[0];
  assert.equal(
    (
      await (
        await fetch(`${base}/api/session`, { headers: { Cookie: cookie } })
      ).json()
    ).authenticated,
    true,
  );

  // Real hosted workflow + separate telemetry service + Gateway, not a direct model-only eval.
  for (const scenario of ["checkout", "provider", "incomplete"]) {
    const started = Date.now();
    const response = await fetch(`${base}/api/investigations`, {
      method: "POST",
      headers: { ...headers, Cookie: cookie },
      body: JSON.stringify({
        scenario,
        mode: "live",
        fault: scenario === "provider" ? "transient" : "none",
      }),
    });
    assert.equal(response.status, 202, await response.clone().text());
    const { runId, runToken } = await response.json();
    assert.equal(
      (await fetch(`${base}/api/investigations/${runId}`)).status,
      403,
    );
    let settled = false;
    for (let i = 0; i < 80; i++) {
      const status = await fetch(`${base}/api/investigations/${runId}`, {
        headers: { "x-run-token": runToken },
      });
      assert.equal(status.status, 200);
      const body = await status.json();
      assert.notEqual(
        body.status,
        "failed",
        `Live workflow failed for ${scenario}`,
      );
      if (body.status === "completed") {
        const { result } = body;
        validateReport(result.report, bundleSchema.parse(result.bundle));
        assert.equal(result.mode, "live");
        assert.equal(result.telemetry.model, "openai/gpt-5.2");
        assert.ok(result.telemetry.inputTokens > 0);
        assert.ok(result.telemetry.outputTokens > 0);
        assert.ok(Number(result.telemetry.costUsd) > 0);
        assert.equal(
          result.telemetry.retrievalAttempts,
          scenario === "provider" ? 2 : 1,
        );
        const retained = await (
          await fetch(`${base}/api/investigations/${runId}`, {
            headers: { "x-run-token": runToken },
          })
        ).json();
        assert.deepEqual(retained.result, result);
        results.push({
          scenario,
          status: body.status,
          runId,
          elapsedMs: Date.now() - started,
          retainedOutput: "identical",
          unauthorizedRead: "denied",
          result,
        });
        console.log(
          `${scenario}: completed live; model=${result.telemetry.model}; cost=$${result.telemetry.costUsd}; retrievalAttempts=${result.telemetry.retrievalAttempts}`,
        );
        settled = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    assert.ok(settled, `Workflow did not settle for ${scenario}`);
  }
  await mkdir("artifacts", { recursive: true });
  // Intentionally omit reviewer codes, cookies, service credentials, and run access tokens.
  await writeFile(
    "artifacts/deployment-live.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        base,
        liveEnabled: true,
        invalidCode: "rejected",
        unauthenticatedLive: "denied",
        secureSession: "verified",
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Live smoke failed");
  process.exitCode = 1;
});
