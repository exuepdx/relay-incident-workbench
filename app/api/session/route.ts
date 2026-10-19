import { cookies } from "next/headers";
import { allowedOrigin, mintSession, sessionCookie, validAccessCode, validSession } from "@/lib/access";
import { config } from "@/lib/config";

export async function GET() {
  const token = (await cookies()).get(sessionCookie)?.value;
  return Response.json(
    {
      authenticated: validSession(token),
      demoControls: config.demoControls,
      model: config.model,
      fallbackModels: config.fallbackModels,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return Response.json({ error: "Origin rejected" }, { status: 403 });
  const body = await request.text();
  if (body.length > 512) return Response.json({ error: "Request too large" }, { status: 413 });
  let code: unknown;
  try {
    code = JSON.parse(body).code;
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!validAccessCode(code)) return Response.json({ error: "That access code is not valid." }, { status: 401 });
  (await cookies()).set(sessionCookie, mintSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: config.sessionHours * 3600,
    path: "/",
  });
  return Response.json({ authenticated: true });
}
