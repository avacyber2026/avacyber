import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppAuthCookie, getAdminAuthCookie } from "@/lib/authCookies";

const APP_PROTECTED = ["/tickets", "/report"];
const ADMIN_AUTH = "/admin/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin area: require adminToken except on /admin/auth (auth page always reachable so user can re-login)
  if (pathname.startsWith("/admin")) {
    if (pathname === ADMIN_AUTH) {
      return NextResponse.next();
    }
    if (pathname === "/admin") {
      const adminToken = getAdminAuthCookie(request);
      if (adminToken) {
        return NextResponse.redirect(new URL("/admin/requests", request.url));
      }
      return NextResponse.redirect(new URL(ADMIN_AUTH, request.url));
    }
    const adminToken = getAdminAuthCookie(request);
    if (!adminToken) {
      return NextResponse.redirect(new URL(ADMIN_AUTH, request.url));
    }
    return NextResponse.next();
  }

  // App protected routes: require appToken
  const isProtected = APP_PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isProtected) {
    const appToken = getAppAuthCookie(request);
    if (!appToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tickets", "/tickets/:path*", "/report", "/report/:path*", "/admin", "/admin/:path*"],
};
