import { evaluationCases } from "../lib/evaluation-cases";
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSteps, totals } from "../lib/gateway";
import { acknowledgeProposal, buildTools, readToolNames } from "../lib/tools";

test("accounting reduces gateway metadata into served model, cost, and fallback use", () => {
  const steps = summarizeSteps([
    {
      toolCalls: [{ toolName: "getServiceMetrics" }, { toolName: "getSlowTraces" }],
      usage: { inputTokens: 1000, outputTokens: 50 },
      response: { modelId: "openai/gpt-5.2" },
      providerMetadata: {
        gateway: {
          cost: "0.0100",
          generationId: "gen_1",
          modelAttempts: [
            {
              canonicalSlug: "openai/gpt-5.2",
              success: true,
              providerAttempts: [{ provider: "openai", success: true }],
            },
          ],
        },
      },
    },
    {
      toolCalls: [],
      usage: { inputTokens: 2000, outputTokens: 500 },
      response: { modelId: "anthropic/claude-sonnet-5" },
      providerMetadata: {
        gateway: {
          cost: 0.02,
          generationId: "gen_2",
          modelAttempts: [
            {
              canonicalSlug: "openai/gpt-5.2",
              success: false,
              providerAttempts: [{ provider: "bedrock", success: false, error: "no provider" }],
            },
            {
              canonicalSlug: "anthropic/claude-sonnet-5",
              success: true,
              providerAttempts: [{ provider: "bedrock", success: true }],
            },
          ],
        },
      },
    },
  ] as never);
  assert.deepEqual(steps[0].toolCalls, ["getServiceMetrics", "getSlowTraces"]);
  assert.equal(steps[1].model, "anthropic/claude-sonnet-5");
  assert.equal(steps[1].modelAttempts[0].success, false);
  const sum = totals(steps);
  assert.equal(sum.totalInputTokens, 3000);
  assert.equal(sum.totalOutputTokens, 550);
  assert.equal(sum.totalCostUsd, "0.030000");
  assert.equal(sum.servedBy, "anthropic/claude-sonnet-5");
  assert.equal(sum.fallbackUsed, true);
});

test("the read tools take no free-form input and call the customer API executors", async () => {
  const calls: string[] = [];
  const tools = buildTools(
    {
      getServiceMetrics: async () => (calls.push("m"), { incidentId: "INC-0241", kind: "metric", evidence: [] }),
      getSlowTraces: async () => (calls.push("t"), { incidentId: "INC-0241", kind: "trace", evidence: [] }),
      getRecentChanges: async () => (calls.push("c"), { incidentId: "INC-0241", kind: "change", evidence: [] }),
      proposeMitigation: acknowledgeProposal,
    },
    evaluationCases()[0].incident,
  );
  assert.deepEqual(Object.keys(tools).sort(), [...readToolNames, "proposeMitigation"].sort());
  for (const name of readToolNames) await tools[name].execute?.({}, { toolCallId: "x", messages: [] } as never);
  assert.deepEqual(calls.sort(), ["c", "m", "t"]);
});

test("real Gateway nested routing metadata overrides the requested response model", () => {
  const steps = summarizeSteps([
    {
      toolCalls: [],
      usage: {},
      response: { modelId: "openai/gpt-5.2" },
      providerMetadata: {
        gateway: {
          cost: "0.001",
          routing: {
            canonicalSlug: "google/gemini-2.5-flash",
            modelAttempts: [
              { canonicalSlug: "openai/gpt-5.2", success: false, providerAttempts: [] },
              {
                canonicalSlug: "google/gemini-2.5-flash",
                success: true,
                providerAttempts: [{ provider: "google", success: true }],
              },
            ],
          },
        },
      },
    },
  ] as never);
  assert.equal(totals(steps).servedBy, "google/gemini-2.5-flash");
  assert.equal(totals(steps).fallbackUsed, true);
});
