/**
 * The customer's world. Names used across the UI and proposal live here so the
 * scenario can be re-pointed at a specific stack in one edit.
 */
export const customer = {
  name: "Northstar Commerce",
  short: "Northstar",
  industry: "enterprise retail",
  cloud: "AWS",
  region: "us-east-1",
  compute: "EKS",
  database: "RDS Postgres",
  releasePipeline: "Jenkins + EKS",
  observability: "the existing OpenTelemetry-based observability platform",
  observabilityShort: "observability platform",
  modelProvider: "Bedrock",
  /**
   * Display copy for navigation and incident headings, separate from the
   * telemetry fixture and model inputs. Static on purpose: the shell
   * must prerender without the customer API; each incident's own segment is
   * fetched and cached per id at request time.
   */
  incidents: [
    {
      id: "INC-0244",
      short: "Checkout and inventory",
      title: "Checkout and inventory degradation",
      description: "Elevated checkout latency and inventory connection waits across multiple services.",
    },
    {
      id: "INC-0241",
      short: "Checkout regression",
      title: "Checkout latency after a release",
      description: "Response times increased after deployment. Compare the release with trace and service metrics.",
    },
    {
      id: "INC-0242",
      short: "Provider degradation",
      title: "Payment request timeouts",
      description: "Payment requests are timing out. Review provider latency alongside the recent deployment.",
    },
    {
      id: "INC-0243",
      short: "Incomplete evidence",
      title: "Checkout latency with missing traces",
      description: "Latency is elevated, but downstream spans are missing from the incident record.",
    },
  ],
  leadIncident: "INC-0244",
};
