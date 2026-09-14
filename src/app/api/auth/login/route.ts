import { NextResponse } from "next/server";
import {
  authConfigured,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (!authConfigured()) {
      return NextResponse.json(
        { error: "Login is not configured. Set AUTH_USERNAME, AUTH_PASSWORD, and AUTH_SECRET." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!(await verifyCredentials(username, password))) {
      return NextResponse.json(
        { error: "Wrong username or password." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(username.trim());
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to log in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
