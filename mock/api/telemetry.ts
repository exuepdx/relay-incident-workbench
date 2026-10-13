import { handleTelemetry } from "../handler";
export function GET(request: Request) {
  return handleTelemetry(request, process.env.TELEMETRY_API_TOKEN);
}
