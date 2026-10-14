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
  /** Known incident ids served by the telemetry API. */
  incidents: ["INC-0244", "INC-0241", "INC-0242", "INC-0243"] as const,
  leadIncident: "INC-0244",
};

export type IncidentId = (typeof customer.incidents)[number];
