import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Output, ToolLoopAgent, stepCountIs } from "ai";
import { config } from "../lib/config";
import { briefing, instructions } from "../lib/agent";
import { gatewayOptions, resolveModel, summarizeSteps, totals } from "../lib/gateway";
import { reportSchema } from "../lib/contracts";
import { validateAgentRun } from "../lib/run-validation";
import { buildTools } from "../lib/tools";
import { caseExecutors, evaluationCases, evaluationRegressions } from "../lib/evaluation-cases";

/**
 * Runs the same agent (instructions, tools, output schema, gateway routing)
 * outside the workflow against eight cases, then writes a report with prompt
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
  const delayMs = Number(process.argv.find((a) => a.startsWith("--delay-ms="))?.slice(11) ?? "0");
  for (const item of selected) {
    if (results.length && delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const started = Date.now();
    let rawOutput: unknown;
    let rawSteps: unknown;
    try {
      const agent = new ToolLoopAgent({
        model: resolveModel(),
        instructions,
        tools: buildTools(caseExecutors(item), item.incident),
        output: Output.object({ schema: reportSchema }),
        stopWhen: stepCountIs(config.maxAgentSteps),
        maxOutputTokens: config.maxOutputTokens,
        maxRetries: config.modelRetries,
        providerOptions: gatewayOptions("none"),
      });
      const result = await agent.generate({ prompt: briefing(item.incident), timeout: config.modelTimeoutMs });
      rawOutput = result.output;
      rawSteps = summarizeSteps(result.steps);
      const {
        report,
        evidence: retrievedEvidence,
        proposal,
      } = validateAgentRun(item.incident, result.output, result.steps);
      const modelSteps = summarizeSteps(result.steps);
      const toolsCalled = modelSteps.flatMap((s) => s.toolCalls);
      const checks = {
        structuralValidation: "passed",
        assessmentPassed: report.assessment === item.expectedAssessment,
        allToolsCalled: ["getServiceMetrics", "getSlowTraces", "getRecentChanges"].every((t) =>
          toolsCalled.includes(t),
        ),
        regressionFailures: evaluationRegressions(item, report, proposal),
      };
      if (!checks.assessmentPassed || !checks.allToolsCalled || checks.regressionFailures.length) failures++;
      results.push({
        name: item.name,
        ...checks,
        evidenceSha256: createHash("sha256").update(JSON.stringify(item.evidence)).digest("hex"),
        humanReviewRubric: item.review,
        humanReview: "pending",
        report,
        proposal,
        retrievedEvidence,
        briefingSha256: createHash("sha256").update(briefing(item.incident)).digest("hex"),
        toolsCalled,
        elapsedMs: Date.now() - started,
        ...totals(modelSteps),
        modelSteps,
      });
      console.log(
        `${item.name}: ${checks.assessmentPassed && !checks.regressionFailures.length ? "ok" : "FAILED CHECKS"} · assessment ${report.assessment} · tools ${toolsCalled.join(",")} · $${totals(modelSteps).totalCostUsd ?? "n/a"} · ${Date.now() - started}ms`,
      );
    } catch (error) {
      failures++;
      const message = error instanceof Error ? error.message : "Unknown error";
      results.push({
        name: item.name,
        humanReviewRubric: item.review,
        error: message,
        rawOutput,
        modelSteps: rawSteps,
        elapsedMs: Date.now() - started,
      });
      console.log(`${item.name}: FAILED · ${message}`);
      if (/auth|credit|payment|verification|api key|budget exceeded/i.test(message)) break;
    }
  }
  await mkdir("artifacts", { recursive: true });
  const path =
    process.argv.find((a) => a.startsWith("--out="))?.slice(6) ??
    (only
      ? `artifacts/evaluation-${only}.json`
      : process.argv.includes("--first")
        ? "artifacts/evaluation-probe.json"
        : "artifacts/evaluation.json");
  await writeFile(
    path,
    JSON.stringify(
      {
        mode: process.env.RELAY_FAKE_GATEWAY_URL ? "simulated" : "live",
        evaluatedAt: new Date().toISOString(),
        model: config.model,
        fallbackModels: config.fallbackModels,
        promptSha256: createHash("sha256").update(instructions).digest("hex"),
        contractSha256: createHash("sha256")
          .update(await readFile("lib/contracts.ts", "utf8"))
          .digest("hex"),
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
