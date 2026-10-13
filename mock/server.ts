import { createServer } from "node:http";
import { handleTelemetry } from "./handler";

createServer(async (req, res) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers))
    if (value) headers.set(key, String(value));
  const response = handleTelemetry(
    new Request(`http://127.0.0.1:4319${req.url}`, {
      method: req.method,
      headers,
    }),
    process.env.TELEMETRY_API_TOKEN || "local-demo-token",
  );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}).listen(4319, "127.0.0.1", () =>
  console.log("Synthetic telemetry API: http://127.0.0.1:4319/api/telemetry"),
);
