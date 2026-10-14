import { cacheLife, cacheTag } from "next/cache";
import { customerGet } from "./customer-client";
import { incidentSchema, type Incident } from "./contracts";

/**
 * Cached reads of the customer's incident catalog for the UI shell.
 *
 * Rendering story in one breath: the page chrome is prerendered at build
 * with no dependency on the customer API; the incident segment is fetched on
 * first request, cached for hours, and tagged per incident so one incident
 * can be refreshed without touching the others; saved runs and the live
 * investigation stream at request time.
 */
export async function getIncident(id: string): Promise<Incident | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("incidents", `incident:${id}`);
  try {
    return await customerGet(`/incidents/${id}`, incidentSchema);
  } catch (error) {
    if (error instanceof Error && /\(404\)/.test(error.message)) return null;
    throw error;
  }
}
