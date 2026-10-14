# Evaluation artifacts

| File | What it is |
| --- | --- |
| `evaluation.json` | Latest run of `npm run eval` against the current agent (seven cases). Created when you run the harness with Gateway access. |
| `v1-gpt52-first-pass.json` | Iteration 1 (single model call, no tools): the first GPT-5.2 pass. One output turned a single observed HTTP 504 into "frequent 504s". |
| `v1-provider-scope-regression.json` | The exact report that motivated the deterministic observation-scope guard in `lib/contracts.ts`. |
| `v1-seven-cases-final.json` | Iteration 1 final: seven cases passing structure, citations, assessment, and regressions on GPT-5.2 (about $0.01 per case). |
| `local-smoke.json`, `deployment-smoke.json` | Output of `npm run smoke` against the offline harness or a deployment. |

Automated checks prove structure, citation validity, the expected assessment,
that the agent used its tools, and the absence of known regressions. They do
not prove a claim is true. Every artifact carries the prompt and evidence
hashes and a human-review rubric so a reviewer can read each report against
its inputs.
