/**
 * Authentication middleware for MahaSetu.
 *
 * This middleware:
 * 1. Checks for a session cookie
 * 2. Validates the session is still valid
 * 3. Attaches the user to the request context
 * 4. Redirects unauthenticated requests to /login (except for login itself)
 */

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "./src/platform/session";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/api/auth/login"];

function unauthenticatedResponse(request: NextRequest, clearSession = false): NextResponse {
  const response = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL("/login", request.url));

  if (clearSession) response.cookies.delete("sid");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - allow access without auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Get session from cookie
  const sessionId = request.cookies.get("sid")?.value;

  if (!sessionId) {
    return unauthenticatedResponse(request);
  }

  // Validate session
  const session = await readSession(sessionId);
  if (!session) {
    return unauthenticatedResponse(request, true);
  }

  // Session is valid - continue
  return NextResponse.next();
}

// Configure which paths this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
