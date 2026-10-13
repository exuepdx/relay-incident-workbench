# Product feedback — observations from this build

Draft for the candidate to review and personalize. These are observations from the
actual build, not claims about production operation at scale.

- **Workflow is an effective way to demonstrate continuity.** The same TypeScript
  implementation supported separate retrieval and synthesis steps, a retrying
  external call, and reconnecting to retained output. Local fault injection made
  the durability discussion concrete.
- **Gateway account activation was less obvious than the feature documentation.**
  The account initially returned a zero balance; the first inference request then
  explained that a card was required to unlock free credits. An earlier readiness
  check or clearer onboarding message would avoid learning this at inference time.
- **A deployment marked ready still needs a functional check.** The initial standalone
  Node mock deployment reported TypeScript ESM diagnostics but completed deployment;
  its endpoint returned 500. Adding a dedicated mock TypeScript configuration and
  explicit ESM imports resolved it. It would help if this class of diagnostic failed
  the build or was highlighted prominently before the ready state.
- **Project-level budget controls were useful for an interview demo.** A non-refreshing
  cap could be configured through the CLI without changing account billing. The
  application still needs its own admission controls for broader use.
- **The state boundary deserves first-class explanation.** “Survives a browser refresh”
  is easy to show. Data retention, version compatibility, and application rollback
  versus workflow state require a more careful customer conversation.

After live inference is enabled, add observations on response quality, structured
output behavior, accounting metadata, and model latency from measured runs.
