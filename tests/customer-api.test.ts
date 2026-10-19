import { test } from "node:test";
import assert from "node:assert/strict";
import { handleTelemetry, type Dataset } from "../customer-api/handler";
import data from "../customer-api/data/incidents.json";
import { evidenceListSchema, incidentListSchema, incidentSchema } from "../lib/contracts";

const env = { token: "secret", data: data as Dataset };
const get = (path: string, headers: Record<string, string> = {}) =>
  handleTelemetry(
    new Request(`https://telemetry.northstar.example${path}`, {
      headers: { authorization: "Bearer secret", ...headers },
    }),
    env,
  );

test("health needs no auth; everything else does", async () => {
  assert.equal(handleTelemetry(new Request("https://x/health"), env).status, 200);
  for (const token of ["", "Bearer wrong", "Bearer secret-extra"]) {
    const r = handleTelemetry(new Request("https://x/incidents", { headers: { authorization: token } }), env);
    assert.equal(r.status, 401);
  }
});

test("missing service configuration fails closed", () => {
  assert.equal(
    handleTelemetry(new Request("https://x/incidents", { headers: { authorization: "Bearer secret" } }), {
      token: undefined,
      data: env.data,
    }).status,
    503,
  );
});

test("the API is read-only and ignores inherited property names", () => {
  assert.equal(
    handleTelemetry(
      new Request("https://x/incidents/INC-0244", { method: "POST", headers: { authorization: "Bearer secret" } }),
      env,
    ).status,
    405,
  );
  assert.equal(get("/incidents/__proto__").status, 404);
  assert.equal(get("/incidents/INC-9999").status, 404);
  assert.equal(get("/incidents/INC-0244/secrets").status, 404);
});

test("fault injection returns a real 503 with no evidence", async () => {
  const r = get("/incidents/INC-0244/metrics", { "x-demo-fault": "unavailable" });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).evidence, undefined);
});

test("responses are non-cacheable and match the consumer contracts", async () => {
  const list = get("/incidents");
  assert.equal(list.headers.get("cache-control"), "no-store");
  assert.equal(incidentListSchema.parse(await list.json()).length, 4);
  for (const id of ["INC-0244", "INC-0241", "INC-0242", "INC-0243"]) {
    const incident = incidentSchema.parse(await get(`/incidents/${id}`).json());
    assert.equal(incident.id, id);
    // The briefing carries only coverage notes; measurements come from tools.
    assert.ok(incident.coverage.every((e) => e.kind === "coverage"));
    for (const [path, kind] of [
      ["metrics", "metric"],
      ["traces", "trace"],
      ["changes", "change"],
      ["evidence", "all"],
    ] as const) {
      const body = evidenceListSchema.parse(await get(`/incidents/${id}/${path}`).json());
      assert.equal(body.kind, kind);
      if (kind !== "all") assert.ok(body.evidence.every((e) => e.kind === kind));
    }
  }
});

test("the full register is the union of the tool endpoints and the briefing", async () => {
  const all = evidenceListSchema
    .parse(await get("/incidents/INC-0244/evidence").json())
    .evidence.map((e) => e.id)
    .sort();
  const parts: string[] = [];
  for (const path of ["metrics", "traces", "changes"]) {
    parts.push(...evidenceListSchema.parse(await get(`/incidents/INC-0244/${path}`).json()).evidence.map((e) => e.id));
  }
  parts.push(...incidentSchema.parse(await get("/incidents/INC-0244").json()).coverage.map((e) => e.id));
  assert.deepEqual(parts.sort(), all);
});
