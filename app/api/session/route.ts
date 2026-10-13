import { cookies } from "next/headers";
import { constantEqual, mintSession, validSession } from "@/lib/access";

export async function GET() {
  const token = (await cookies()).get("relay-reviewer")?.value ?? "";
  return Response.json({ liveEnabled: process.env.ENABLE_LIVE_AI === "true", authenticated: validSession(token) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origin rejected" }, { status: 403 });
  const body = await request.text();
  if (body.length > 512) return Response.json({ error: "Request too large" }, { status: 413 });
  let code: unknown;
  try { code = JSON.parse(body).code; } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (typeof code !== "string" || !process.env.DEMO_ACCESS_CODE || !constantEqual(code, process.env.DEMO_ACCESS_CODE)) {
    return Response.json({ error: "That access code is not valid" }, { status: 401 });
  }
  (await cookies()).set("relay-reviewer", mintSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 3600, path: "/" });
  return Response.json({ authenticated: true });
}
