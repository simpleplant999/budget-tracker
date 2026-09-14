import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isLoginApi = pathname === "/api/auth/login";
  const isLogoutApi = pathname === "/api/auth/logout";

  try {
    const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);

    if (isLoginPage || isLoginApi) {
      if (user && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next();
    }

    if (isLogoutApi) {
      return NextResponse.next();
    }

    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Please log in." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    if (isLoginPage || isLoginApi || isLogoutApi) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
