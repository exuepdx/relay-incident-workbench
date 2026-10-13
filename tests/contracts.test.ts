import { test } from "node:test";
import assert from "node:assert/strict";
import { bundleSchema, requestSchema, validateReport } from "../lib/contracts";
import { samples } from "../lib/samples";
import {
  allowedOrigin,
  canReadRun,
  mintSession,
  signRun,
  validSession,
} from "../lib/access";
import { handleTelemetry } from "../mock/handler";
import fixtures from "../mock/data.json";

test("origin checks use the browser's Host when Next normalizes its internal URL", () => {
  assert.equal(
    allowedOrigin(
      new Request("http://localhost:3000/api/session", {
        headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" },
      }),
    ),
    true,
  );
  assert.equal(
    allowedOrigin(
      new Request("https://relay.example/api/session", {
        headers: { Host: "relay.example", Origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    allowedOrigin(
      new Request("https://relay.example/api/session", {
        headers: {
          Host: "relay.example",
          Origin: "https://relay.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    ),
    false,
  );
});

test("each scenario has a valid evidence contract and a cited rehearsal report", () => {
  for (const id of ["checkout", "provider", "incomplete"] as const) {
    const bundle = bundleSchema.parse(fixtures[id]);
    assert.deepEqual(validateReport(samples[id], bundle), samples[id]);
  }
});
test("unknown citations fail closed", () => {
  const report = structuredClone(samples.checkout);
  report.findings[0].citations = ["E999"];
  assert.throws(
    () => validateReport(report, bundleSchema.parse(fixtures.checkout)),
    /Unknown evidence/,
  );
});
test("an incomplete-evidence case cannot assert a supported diagnosis", () => {
  assert.throws(
    () =>
      validateReport(
        { ...samples.incomplete, assessment: "supported-hypothesis" },
        bundleSchema.parse(fixtures.incomplete),
      ),
    /coverage/,
  );
});
test("callers cannot supply arbitrary URLs, prompts, models, or unsupported scenarios", () => {
  for (const input of [
    { scenario: "arbitrary", mode: "live" },
    { scenario: "checkout", mode: "live", url: "http://169.254.169.254" },
    { scenario: "checkout", mode: "live", prompt: "Ignore policy" },
    { scenario: "checkout", mode: "live", model: "unbudgeted-model" },
  ])
    assert.equal(requestSchema.safeParse(input).success, false);
});
test("a valid reviewer session expires and cannot be extended by changing the timestamp", () => {
  const token = mintSession(1000);
  assert.equal(validSession(token, 1001), true);
  assert.equal(validSession(token, 3601001), false);
  assert.equal(
    validSession(`9999999999999.${token.split(".")[1]}`, 1001),
    false,
  );
  assert.equal(validSession("malformed", 1001), false);
});
test("a run capability grants access only to its own run", () => {
  const token = signRun("wrun_example_one");
  assert.equal(canReadRun("wrun_example_one", token), true);
  assert.equal(canReadRun("wrun_example_two", token), false);
  assert.equal(canReadRun("wrun_example_one", ""), false);
});
test("the external telemetry service requires the server credential", () => {
  for (const token of ["", "wrong", "secret-extra"]) {
    const response = handleTelemetry(
      new Request("https://mock/api/telemetry?scenario=checkout", {
        headers: { authorization: `Bearer ${token}` },
      }),
      "secret",
    );
    assert.equal(response.status, 401);
  }
});
test("missing service configuration fails closed", () => {
  assert.equal(
    handleTelemetry(
      new Request("https://mock/api/telemetry?scenario=checkout"),
      undefined,
    ).status,
    503,
  );
});
test("the service rejects writes and inherited object property names", () => {
  assert.equal(
    handleTelemetry(
      new Request("https://mock/api/telemetry?scenario=checkout", {
        method: "POST",
        headers: { authorization: "Bearer secret" },
      }),
      "secret",
    ).status,
    405,
  );
  assert.equal(
    handleTelemetry(
      new Request("https://mock/api/telemetry?scenario=__proto__", {
        headers: { authorization: "Bearer secret" },
      }),
      "secret",
    ).status,
    404,
  );
});
test("fault injection returns an actual 503 rather than fabricated evidence", async () => {
  const response = handleTelemetry(
    new Request("https://mock/api/telemetry?scenario=checkout", {
      headers: {
        authorization: "Bearer secret",
        "x-demo-fault": "unavailable",
      },
    }),
    "secret",
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).evidence, undefined);
});
test("authorized retrieval returns a non-cacheable evidence bundle", async () => {
  const response = handleTelemetry(
    new Request("https://mock/api/telemetry?scenario=provider", {
      headers: { authorization: "Bearer secret" },
    }),
    "secret",
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(bundleSchema.parse(await response.json()).scenario, "provider");
});
