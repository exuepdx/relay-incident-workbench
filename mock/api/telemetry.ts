import { handleTelemetry } from "../handler.js";
export function GET(request: Request) {
  return handleTelemetry(request, process.env.TELEMETRY_API_TOKEN);
}
