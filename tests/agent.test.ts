import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSteps, totals } from "../lib/gateway";
import { buildTools, toolNames } from "../lib/tools";

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

test("the tool set exposes exactly three read-only tools with no free-form input", async () => {
  const calls: string[] = [];
  const tools = buildTools({
    getServiceMetrics: async () => (calls.push("m"), { incidentId: "INC-0241", kind: "metric", evidence: [] }),
    getSlowTraces: async () => (calls.push("t"), { incidentId: "INC-0241", kind: "trace", evidence: [] }),
    getRecentChanges: async () => (calls.push("c"), { incidentId: "INC-0241", kind: "change", evidence: [] }),
  });
  assert.deepEqual(Object.keys(tools).sort(), [...toolNames].sort());
  for (const name of toolNames) await tools[name].execute?.({}, { toolCallId: "x", messages: [] } as never);
  assert.deepEqual(calls.sort(), ["c", "m", "t"]);
});
