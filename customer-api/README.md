# Northstar telemetry API (the customer's world)

A read-only, bearer-authenticated API that represents the customer's existing
observability platform. Synthetic data, four incidents, one handler, three
deployment targets.

| Target | When | How |
| --- | --- | --- |
| Local | development, tests, smoke | `npm run customer-api` from the repo root (port 4319) |
| AWS Lambda function URL, us-east-1 | **primary**: the demo crosses a real cloud boundary | `TELEMETRY_API_TOKEN=... ./deploy-lambda.sh` |
| Vercel Function | fallback if AWS is unavailable | `vercel deploy` from this folder with `TELEMETRY_API_TOKEN` set |

## Endpoints

| Path | Returns |
| --- | --- |
| `GET /health` | liveness, no auth |
| `GET /incidents` | incident list |
| `GET /incidents/INC-0244` | incident record: KPIs, latency series, representative spans, dependency catalog, coverage notes. No measurements. |
| `GET /incidents/INC-0244/metrics` | metric evidence (tool: `getServiceMetrics`) |
| `GET /incidents/INC-0244/traces` | trace evidence (tool: `getSlowTraces`) |
| `GET /incidents/INC-0244/changes` | change evidence (tool: `getRecentChanges`) |
| `GET /incidents/INC-0244/evidence` | the full register, used to validate citations |

Send `x-demo-fault: unavailable` to get a 503 (the app's "Test resilience" control does this).

## Production path

In a real engagement this API is the customer's observability vendor or an
adapter in their VPC. The app reaches it over HTTPS with a scoped read-only
credential. If it sits behind an IP allowlist or private subnet, Vercel Secure
Compute provides static egress IPs and VPC peering.
