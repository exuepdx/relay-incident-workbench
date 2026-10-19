import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Output, ToolLoopAgent, stepCountIs } from "ai";
import { config } from "../lib/config";
import { briefing, instructions } from "../lib/agent";
import { gatewayOptions, resolveModel, summarizeSteps, totals } from "../lib/gateway";
import { reportSchema, validateReport } from "../lib/contracts";
import { buildTools, readToolNames } from "../lib/tools";
import { caseExecutors, evaluationCases, evaluationRegressions } from "../lib/evaluation-cases";

/**
 * Runs the same agent (instructions, tools, output schema, gateway routing)
 * outside the workflow against seven cases, then writes a report with prompt
 * and evidence hashes so a reviewer can tie every output to its inputs.
 *
 *   npm run eval                       all cases
 *   npm run eval -- --case=cascading-network
 *   npm run eval -- --first            one case, to probe access and credits
 */
async function main() {
  const all = evaluationCases();
  const only = process.argv.find((a) => a.startsWith("--case="))?.slice(7);
  const selected = only ? all.filter((c) => c.name === only) : process.argv.includes("--first") ? all.slice(0, 1) : all;
  if (!selected.length) throw new Error("Unknown evaluation case");
  const results: unknown[] = [];
  let failures = 0;
  for (const item of selected) {
    const started = Date.now();
    try {
      const agent = new ToolLoopAgent({
        model: resolveModel(),
        instructions,
        tools: buildTools(caseExecutors(item)),
        output: Output.object({ schema: reportSchema }),
        stopWhen: stepCountIs(config.maxAgentSteps),
        maxOutputTokens: config.maxOutputTokens,
        maxRetries: config.modelRetries,
        providerOptions: gatewayOptions("none"),
      });
      const result = await agent.generate({ prompt: briefing(item.incident) });
      const report = validateReport(result.output, item.evidence, item.incident.reportPolicy);
      const modelSteps = summarizeSteps(result.steps);
      const toolsCalled = modelSteps.flatMap((s) => s.toolCalls);
      const checks = {
        structuralValidation: "passed",
        assessmentPassed: report.assessment === item.expectedAssessment,
        allToolsCalled: ["getServiceMetrics", "getSlowTraces", "getRecentChanges"].every((t) =>
          toolsCalled.includes(t),
        ),
        regressionFailures: evaluationRegressions(item, report),
      };
      if (!checks.assessmentPassed || !checks.allToolsCalled || checks.regressionFailures.length) failures++;
      results.push({
        name: item.name,
        ...checks,
        evidenceSha256: createHash("sha256").update(JSON.stringify(item.evidence)).digest("hex"),
        humanReviewRubric: item.review,
        humanReview: "pending",
        report,
        toolsCalled,
        elapsedMs: Date.now() - started,
        ...totals(modelSteps),
        modelSteps,
      });
      console.log(
        `${item.name}: ok · assessment ${report.assessment} · tools ${toolsCalled.join(",")} · $${totals(modelSteps).totalCostUsd ?? "n/a"} · ${Date.now() - started}ms`,
      );
    } catch (error) {
      failures++;
      const message = error instanceof Error ? error.message : "Unknown error";
      results.push({ name: item.name, error: message, elapsedMs: Date.now() - started });
      console.log(`${item.name}: FAILED · ${message}`);
      if (/auth|credit|payment|verification|api key/i.test(message)) break;
    }
  }
  await mkdir("artifacts", { recursive: true });
  const path = only
    ? `artifacts/evaluation-${only}.json`
    : process.argv.includes("--first")
      ? "artifacts/evaluation-probe.json"
      : "artifacts/evaluation.json";
  await writeFile(
    path,
    JSON.stringify(
      {
        evaluatedAt: new Date().toISOString(),
        model: config.model,
        fallbackModels: config.fallbackModels,
        promptSha256: createHash("sha256").update(instructions).digest("hex"),
        cases: results.length,
        failures,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`wrote ${path} · ${results.length} cases · ${failures} failures`);
  process.exitCode = failures ? 1 : 0;
}
void main();
