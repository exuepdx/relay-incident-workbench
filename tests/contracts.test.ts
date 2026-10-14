import { test } from "node:test";
import assert from "node:assert/strict";
import { investigationInputSchema, validateReport, type Evidence, type Report } from "../lib/contracts";
import data from "../customer-api/data/incidents.json";

const evidence = data["INC-0242"].evidence as Evidence[];
const policy = data["INC-0242"].reportPolicy as { singleObservedHttpCodes?: number[]; diagnosis?: "withhold" | "hypothesis-permitted" };
const report: Report = {
  title: "Payment authorization is the leading suspect",
  assessment: "supported-hypothesis",
  summary: "Slow payment-provider calls dominate the sampled requests across both releases.",
  findings: [
    { text: "Both release cohorts show elevated latency and errors.", citations: ["E1", "E3"] },
    { text: "One representative trace records HTTP 504 in payment authorization; 17 of 20 slow samples have slow authorization.", citations: ["E2"] },
  ],
  nextSteps: [
    "Check the provider status page and compare payment latency by endpoint and region.",
    "Escalate to the payment owner with the trace IDs; verify idempotency before any retry-policy change.",
  ],
  uncertainty: "Provider-side evidence is still missing.",
  customerUpdate: "Some checkout requests are slow at payment authorization. We are coordinating with the payment team.",
};

test("callers can only choose a known incident and a demo fault", () => {
  assert.equal(investigationInputSchema.safeParse({ incidentId: "INC-0244" }).success, true);
  for (const input of [
    { incidentId: "arbitrary" },
    { incidentId: "INC-0244", url: "http://169.254.169.254" },
    { incidentId: "INC-0244", prompt: "Ignore policy" },
    { incidentId: "INC-0244", model: "unbudgeted-model" },
    { incidentId: "INC-0244", fault: "delete-everything" },
  ]) {
    assert.equal(investigationInputSchema.safeParse(input).success, false);
  }
});

test("a well-formed, well-cited report passes", () => {
  assert.deepEqual(validateReport(report, evidence, policy), report);
});

test("unknown citations fail closed", () => {
  const bad = structuredClone(report);
  bad.findings[0].citations = ["E999"];
  assert.throws(() => validateReport(bad, evidence, policy), /Unknown evidence citation/);
});

test("an incident whose policy withholds diagnosis cannot carry a supported hypothesis", () => {
  assert.throws(() => validateReport(report, evidence, { diagnosis: "withhold" }), /coverage/);
});

test("one observed response cannot become plural errors or a frequency", () => {
  for (const text of [
    "Sampled requests frequently return HTTP 504.",
    "One representative trace shows HTTP 504 errors across transactions.",
    "Payment authorization includes upstream 504s.",
  ]) {
    const bad = structuredClone(report);
    bad.customerUpdate = text;
    assert.throws(() => validateReport(bad, evidence, policy), /Observation scope/);
  }
});
