import { evaluationCases } from "../lib/evaluation-cases";
import { test } from "node:test";
import assert from "node:assert/strict";
import { approvalDecisionSchema, mitigationProposalSchema, investigationInputSchema } from "../lib/contracts";
import { foldTimeline } from "../components/run-timeline";
import { buildTools, readToolNames, acknowledgeProposal } from "../lib/tools";

test("a mitigation proposal must name an action, an owner, a rationale, an effect, and evidence", () => {
  const ok = mitigationProposalSchema.safeParse({
    action: "Revert the pool maximum to 20",
    owner: "Inventory Services",
    rationale: "Pool waits dominate the slow traces after the limit dropped.",
    expectedEffect: "Acquire waits return to baseline.",
    citations: ["E2", "E3"],
  });
  assert.equal(ok.success, true);
  assert.equal(
    mitigationProposalSchema.safeParse({
      action: "Do it",
      owner: "X",
      rationale: "because",
      expectedEffect: "better",
      citations: [],
    }).success,
    false,
  );
});

test("decisions are approved or declined, by someone, with an optional short note", () => {
  assert.equal(approvalDecisionSchema.safeParse({ decision: "approved", by: "reviewer" }).success, true);
  assert.equal(approvalDecisionSchema.safeParse({ decision: "maybe", by: "reviewer" }).success, false);
  assert.equal(approvalDecisionSchema.safeParse({ decision: "declined", by: "", note: "x" }).success, false);
});

test("inputs accept the pause drill and a model slug but nothing free-form", () => {
  assert.equal(investigationInputSchema.safeParse({ incidentId: "INC-0241", fault: "pause" }).success, true);
  assert.equal(
    investigationInputSchema.safeParse({ incidentId: "INC-0241", model: "google/gemini-2.5-flash" }).success,
    true,
  );
  assert.equal(investigationInputSchema.safeParse({ incidentId: "INC-0241", model: "http://evil" }).success, false);
});

test("the timeline folds approval and pause events into waiting and done rows", () => {
  const rows = foldTimeline(
    [
      { type: "run", status: "started", at: "t0" },
      { type: "pause", status: "started", seconds: 30, at: "t1" },
      { type: "pause", status: "completed", seconds: 30, at: "t2" },
      { type: "approval", status: "requested", detail: "Inventory Services: revert", at: "t3" },
    ],
    null,
  );
  assert.deepEqual(
    rows.map((r) => [r.key, r.state]),
    [
      ["run", "done"],
      ["pause", "done"],
      ["approval", "waiting"],
    ],
  );
  const after = foldTimeline(
    [
      { type: "approval", status: "requested", detail: "x", at: "t3" },
      { type: "approval", status: "declined", detail: "declined by reviewer", at: "t4" },
    ],
    null,
  );
  assert.equal(after[0].state, "done");
  assert.match(after[0].title, /declined/);
  const expired = foldTimeline([{ type: "approval", status: "expired", detail: "", at: "t5" }], null);
  assert.equal(expired[0].state, "failed");
});

test("the tool set is three reads plus one write-shaped request that executes nothing", async () => {
  const tools = buildTools(
    {
      getServiceMetrics: async () => ({ incidentId: "INC-0241", kind: "metric", evidence: [] }),
      getSlowTraces: async () => ({ incidentId: "INC-0241", kind: "trace", evidence: [] }),
      getRecentChanges: async () => ({ incidentId: "INC-0241", kind: "change", evidence: [] }),
      proposeMitigation: acknowledgeProposal,
    },
    evaluationCases()[0].incident,
  );
  assert.deepEqual(Object.keys(tools).sort(), [...readToolNames, "proposeMitigation"].sort());
  await assert.rejects(
    async () =>
      tools.proposeMitigation.execute?.(
        {
          action: "Revert the pool maximum to 20",
          owner: "Inventory Services",
          rationale: "Pool waits dominate the slow traces after the limit dropped.",
          expectedEffect: "Acquire waits return to baseline.",
          citations: ["E2"],
        },
        { toolCallId: "x", messages: [] } as never,
      ),
    /Read every evidence source/,
  );
});
