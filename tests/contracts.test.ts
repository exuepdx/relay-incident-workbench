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
  for (const id of ["checkout", "provider", "incomplete", "network"] as const) {
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

test("topology rejects missing nodes, unknown citations, and duplicate identity", () => {
  for (const mutate of [
    (b: typeof fixtures.network) => {
      b.topology.edges[0].to = "missing-node";
    },
    (b: typeof fixtures.network) => {
      b.topology.nodes[0].citations = ["E999"];
    },
    (b: typeof fixtures.network) => {
      b.topology.handoffs[0].nodeId = "missing-owner";
    },
    (b: typeof fixtures.network) => {
      b.topology.nodes[1].id = b.topology.nodes[0].id;
    },
  ]) {
    const invalid = structuredClone(fixtures.network);
    mutate(invalid);
    assert.equal(bundleSchema.safeParse(invalid).success, false);
  }
});

test("single-observation guard rejects the actual earlier hosted provider regression", async () => {
  const { readFile } = await import("node:fs/promises");
  const report = JSON.parse(
    await readFile("tests/fixtures/provider-scope-regression.json", "utf8"),
  );
  assert.throws(
    () => validateReport(report, bundleSchema.parse(fixtures.provider)),
    /Observation scope/,
  );
});

test("a single observed response cannot become plural errors or a frequency", () => {
  for (const text of [
    "Sampled requests frequently return HTTP 504.",
    "One representative trace shows HTTP 504 errors across transactions.",
    "Payment authorization includes upstream 504s.",
    "One trace shows HTTP 504; multiple requests fail the same way.",
  ]) {
    const report = structuredClone(samples.provider);
    report.customerUpdate = text;
    assert.throws(
      () => validateReport(report, bundleSchema.parse(fixtures.provider)),
      /Observation scope/,
    );
  }
});

test("explicit singular observation and unknown frequency remain acceptable", () => {
  const report = structuredClone(samples.provider);
  report.findings[1].text =
    "One representative trace records HTTP 504; response-code frequency across all requests is unknown.";
  assert.deepEqual(
    validateReport(report, bundleSchema.parse(fixtures.provider)),
    report,
  );
});

test("retained bundles without topology remain readable; new network evidence stays attached", () => {
  assert.equal(bundleSchema.parse(fixtures.checkout).topology, undefined);
  const bundle = bundleSchema.parse(fixtures.network);
  assert.equal(
    bundle.topology?.nodes.find((n) => n.id === "underlay")?.status,
    "unknown",
  );
  assert.equal(
    bundle.topology?.nodes.find((n) => n.id === "network")?.owner,
    "Network Platform",
  );
  assert.deepEqual(validateReport(samples.network, bundle), samples.network);
});

test("missing path evidence must abstain and cannot leak the original topology", async () => {
  const { evaluationCases } = await import("../lib/evaluation-cases");
  const missing = evaluationCases().find(
    (c) => c.name === "network-missing-path-evidence",
  )!;
  assert.equal(missing.bundle.topology, undefined);
  assert.equal(
    missing.bundle.evidence.some((e) => ["E2", "E3"].includes(e.id)),
    false,
  );
  assert.throws(() => validateReport(samples.network, missing.bundle));
});

test("adapter versioning preserves strict legacy clients and includes v2 provenance", async () => {
  for (const version of [undefined, "1", "2", "99"]) {
    const headers: Record<string, string> = { authorization: "Bearer secret" };
    if (version) headers["x-relay-evidence-version"] = version;
    const response = handleTelemetry(
      new Request("https://mock/api/telemetry?scenario=network", { headers }),
      "secret",
    );
    assert.equal(response.status, version === "99" ? 400 : 200);
    if (version === "99") continue;
    const bundle = await response.json();
    assert.equal(Boolean(bundle.topology), version === "2");
    assert.equal(Boolean(bundle.reportPolicy), version === "2");
    assert.equal(bundleSchema.parse(bundle).evidence.length, 7);
  }
});

test("evaluation rejects a conditional policy bypass without path evidence", async () => {
  const { evaluationCases, evaluationRegressions } =
    await import("../lib/evaluation-cases");
  const missing = evaluationCases().find(
    (c) => c.name === "network-missing-path-evidence",
  )!;
  const report = structuredClone(samples.incomplete);
  report.nextSteps[2] =
    "With owner approval, temporarily bypass the new firewall rule if later data implicates it.";
  assert.deepEqual(evaluationRegressions(missing, report), [
    "Operational mitigation proposed before localization",
  ]);
});
