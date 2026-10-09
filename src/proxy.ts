// Keeps the dashboard and the admin behind the login. This is the quick, early check: it
// reads the session cookie and sends anyone without a valid one to /login,
// remembering where they were headed. Pages check again through the DAL.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (session) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  if (pathname !== "/dashboard" && pathname !== "/admin") {
    login.searchParams.set("next", pathname + search);
  }
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
