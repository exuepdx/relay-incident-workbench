import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV !== "production") return "local-only-session-secret-do-not-deploy";
  throw new Error("SESSION_SECRET is required");
}
export function constantEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function signRun(runId: string) {
  return createHmac("sha256", secret()).update(`run:${runId}`).digest("base64url");
}
export function canReadRun(runId: string, token: string) {
  return constantEqual(signRun(runId), token);
}
export function mintSession(now = Date.now()) {
  const expiry = String(now + 60 * 60 * 1000);
  const signature = createHmac("sha256", secret()).update(`reviewer:${expiry}`).digest("base64url");
  return `${expiry}.${signature}`;
}
export function validSession(token: string, now = Date.now()) {
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry) <= now) return false;
  const expected = createHmac("sha256", secret()).update(`reviewer:${expiry}`).digest("base64url");
  return constantEqual(expected, signature);
}
