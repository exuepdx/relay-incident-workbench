import type { z } from "zod";
import { config } from "./config";

/**
 * The only way the application talks to the customer's world.
 *
 * The destination is server configuration, never model- or user-supplied.
 * Every call is read-only, authenticated with a server-held bearer token,
 * bounded by a timeout, and validated against a schema before use.
 */
export type CustomerFetchOptions = {
  /** Demo-only: ask the synthetic service to fail this call. */
  fault?: "unavailable";
  signal?: AbortSignal;
};

export class CustomerApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "CustomerApiError";
  }
}

function baseUrl() {
  const api = process.env.TELEMETRY_API_URL;
  const token = process.env.TELEMETRY_API_TOKEN;
  if (!api || !token) throw new CustomerApiError("Telemetry integration is not configured", 0, false);
  const url = new URL(api);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && local)) {
    throw new CustomerApiError("Telemetry endpoint must use HTTPS", 0, false);
  }
  return { url, token };
}

export async function customerGet<T>(path: string, schema: z.ZodType<T>, options: CustomerFetchOptions = {}): Promise<T> {
  const { url, token } = baseUrl();
  const target = new URL(path.replace(/^\//, ""), url.href.endsWith("/") ? url.href : url.href + "/");
  let response: Response;
  try {
    response = await fetch(target, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.fault ? { "x-demo-fault": options.fault } : {}),
      },
      cache: "no-store",
      redirect: "error",
      signal: options.signal ?? AbortSignal.timeout(config.telemetryTimeoutMs),
    });
  } catch (error) {
    throw new CustomerApiError(`Telemetry connection failed: ${error instanceof Error ? error.message : "unknown"}`, 0, true);
  }
  if (response.status >= 500 || response.status === 429) {
    throw new CustomerApiError(`Telemetry service unavailable (${response.status})`, response.status, true);
  }
  if (!response.ok) throw new CustomerApiError(`Telemetry request rejected (${response.status})`, response.status, false);
  const text = await response.text();
  if (text.length > 64_000) throw new CustomerApiError("Telemetry response exceeds the evidence budget", 200, false);
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new CustomerApiError(`Telemetry contract mismatch: ${parsed.error.issues[0]?.message}`, 200, false);
  return parsed.data;
}
