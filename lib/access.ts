import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

/**
 * Demo access controls. A shared reviewer code mints a signed session cookie
 * that gates starting investigations. Reads are open because every byte is
 * synthetic. Production replaces this with the customer's SSO and tenant
 * authorization; the shape (gate writes, scope reads) stays.
 */
export const sessionCookie = "relay-reviewer";

export function allowedOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients still need the session cookie
  try {
    const source = new URL(origin);
    return ["http:", "https:"].includes(source.protocol) && source.host === (request.headers.get("host") || new URL(request.url).host);
  } catch {
    return false;
  }
}

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV !== "production") return "local-only-session-secret-do-not-deploy";
  throw new Error("SESSION_SECRET is required");
}

export function constantEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function mintSession(now = Date.now()) {
  const expiry = String(now + config.sessionHours * 60 * 60 * 1000);
  const signature = createHmac("sha256", secret()).update(`reviewer:${expiry}`).digest("base64url");
  return `${expiry}.${signature}`;
}

export function validSession(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry) <= now) return false;
  const expected = createHmac("sha256", secret()).update(`reviewer:${expiry}`).digest("base64url");
  return constantEqual(expected, signature);
}

export function validAccessCode(code: unknown) {
  const expected = process.env.DEMO_ACCESS_CODE;
  return typeof code === "string" && Boolean(expected) && constantEqual(code, expected!);
}
