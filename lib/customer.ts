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
   * Open incidents for the navigation chrome. Static on purpose: the shell
   * must prerender without the customer API; each incident's own segment is
   * fetched and cached per id at request time.
   */
  incidents: [
    { id: "INC-0244", short: "Cascading network incident" },
    { id: "INC-0241", short: "Checkout regression" },
    { id: "INC-0242", short: "Provider degradation" },
    { id: "INC-0243", short: "Incomplete evidence" },
  ],
  leadIncident: "INC-0244",
};
