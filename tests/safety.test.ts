import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluationCases, caseExecutors } from "../lib/evaluation-cases";
import { validateAgentRun } from "../lib/run-validation";
import { validateReport, validateProposal } from "../lib/contracts";
import { buildTools, readToolNames } from "../lib/tools";
import reports from "../scripts/fake-reports.json";

const item = evaluationCases().find((c) => c.name === "pool-contention")!;
const proposal = {
  action: "Revert the inventory pool maximum to 20",
  owner: "Inventory Services",
  rationale: "The pool limit change coincides with measured acquisition waits.",
  expectedEffect: "Pool acquisition waits decrease.",
  citations: ["E2", "E3"],
};
async function transcript() {
  const execute = caseExecutors(item);
  return [
    {
      toolCalls: readToolNames.map((toolName) => ({ toolName, input: {} })),
      toolResults: await Promise.all(
        readToolNames.map(async (toolName) => ({ toolName, output: await execute[toolName]() })),
      ),
    },
  ];
}
test("validation uses retrieved snapshots and requires every source before approval", async () => {
  const steps = await transcript();
  const checked = validateAgentRun(item.incident, reports["INC-0241"], steps);
  assert.deepEqual(
    checked.evidence.map((e) => e.id),
    item.evidence.map((e) => e.id),
  );
  assert.throws(() => validateAgentRun(item.incident, reports["INC-0241"], []), /Missing required/);
  const missing = structuredClone(steps);
  missing[0].toolResults[1].output.evidence = [];
  assert.throws(() => validateAgentRun(item.incident, reports["INC-0241"], missing), /Unknown evidence citation/);
  assert.throws(
    () =>
      validateAgentRun(item.incident, reports["INC-0241"], [
        { toolCalls: [{ toolName: "proposeMitigation", input: proposal }], toolResults: [] },
        ...steps,
      ]),
    /preceded required/,
  );
});
test("proposal boundary rejects invented citations, owners and withheld diagnoses", () => {
  assert.deepEqual(validateProposal(proposal, item.evidence, item.incident), proposal);
  assert.throws(() => validateProposal({ ...proposal, citations: ["E999"] }, item.evidence, item.incident), /citation/);
  assert.throws(() => validateProposal({ ...proposal, owner: "Invented team" }, item.evidence, item.incident), /owner/);
  assert.throws(
    () => validateProposal(proposal, item.evidence, { ...item.incident, reportPolicy: { diagnosis: "withhold" } }),
    /not permitted/,
  );
});
test("incomplete reports reject conditional operational experiments at runtime", () => {
  const incomplete = evaluationCases().find((c) => c.name === "incomplete-coverage")!;
  for (const action of [
    "If the owner agrees, revert the firewall policy.",
    "Temporarily bypass the network rule with approval.",
    "Restart the database service to check the hypothesis.",
  ]) {
    const report = {
      ...reports["INC-0243"],
      nextSteps: [action, "Collect missing child spans with Observability Platform."],
    };
    assert.throws(
      () => validateReport(report, incomplete.evidence, incomplete.incident.reportPolicy),
      /before localization/,
    );
  }
});
test("tools return a draft receipt only after validated reads; runtime still validates the final assessment", async () => {
  const tools = buildTools(caseExecutors(item), item.incident);
  for (const name of readToolNames) await tools[name].execute!({}, { toolCallId: name, messages: [] } as never);
  const receipt = (await tools.proposeMitigation.execute!(proposal, { toolCallId: "p", messages: [] } as never)) as {
    status: string;
  };
  assert.equal(receipt.status, "pending-validation");
  const steps = await transcript();
  const report = {
    ...reports["INC-0241"],
    assessment: "insufficient-evidence",
    nextSteps: [
      "Collect additional spans for the affected services.",
      "Request source and destination flow measurements.",
    ],
  };
  assert.throws(
    () =>
      validateAgentRun(item.incident, report, [
        ...steps,
        { toolCalls: [{ toolName: "proposeMitigation", input: proposal }], toolResults: [] },
      ]),
    /not permitted/,
  );
});

test("collecting missing flow telemetry is not an operational mitigation", () => {
  const incomplete = evaluationCases().find((c) => c.name === "incomplete-coverage")!;
  const report = {
    ...reports["INC-0243"],
    nextSteps: [
      "Network Platform should request/enable equivalent network flow records to quantify drops during the window.",
      "Collect missing child spans with Observability Platform.",
    ],
  };
  assert.doesNotThrow(() => validateReport(report, incomplete.evidence, incomplete.incident.reportPolicy));
});
