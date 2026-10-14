import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { handleTelemetry, type Dataset } from "./handler";

const data = JSON.parse(readFileSync(new URL("./data/incidents.json", import.meta.url), "utf8")) as Dataset;
const token = process.env.TELEMETRY_API_TOKEN || "local-dev-token";
const port = Number(process.env.PORT || 4319);

createServer(async (req, res) => {
  const h = new Headers();
  for (const [key, value] of Object.entries(req.headers)) if (value) h.set(key, String(value));
  const response = handleTelemetry(
    new Request(`http://127.0.0.1:${port}${req.url}`, { method: req.method, headers: h }),
    { token, data },
  );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}).listen(port, "127.0.0.1", () => console.log(`Northstar telemetry API (local): http://127.0.0.1:${port}`));
