import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginPage = pathname === "/login";
  const isLoginApi = pathname === "/api/auth/login";

  if (isLoginPage || isLoginApi) {
    if (user && isLoginPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
