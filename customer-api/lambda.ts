import { handleTelemetry, type Dataset } from "./handler";
import data from "./data/incidents.json" with { type: "json" };

/**
 * AWS Lambda function URL adapter. This is the primary deployment of the
 * customer-side API: it lives in the customer's AWS account in us-east-1,
 * behind a bearer token, and represents "what stays".
 */
type FunctionUrlEvent = {
  rawPath: string;
  rawQueryString?: string;
  headers: Record<string, string | undefined>;
  requestContext: { http: { method: string } };
  body?: string;
  isBase64Encoded?: boolean;
};

export async function handler(event: FunctionUrlEvent) {
  const url = `https://lambda.local${event.rawPath}${event.rawQueryString ? `?${event.rawQueryString}` : ""}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) if (value) headers.set(key, value);
  const response = handleTelemetry(new Request(url, { method: event.requestContext.http.method, headers }), {
    token: process.env.TELEMETRY_API_TOKEN,
    data: data as Dataset,
  });
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  };
}
