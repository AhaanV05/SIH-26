/**
 * GET /api/protected/example
 *
 * Example protected endpoint that requires authentication and a specific role.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireAuth, hasRole } from "@/platform/auth";

export async function GET(request: NextRequest) {
  try {
    // Get session cookie
    const sessionId = request.cookies.get("sid")?.value;

    // Check authentication
    const user = await getSessionUser(sessionId || "");
    requireAuth(user);

    // Check if user is finance (example authorization check)
    const isFinance = hasRole(user, "FINANCE_OFFICER");

    return NextResponse.json({
      success: true,
      message: "You are authenticated",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.memberships.map((m) => m.role),
      },
      isFinance,
    });
  } catch (error) {
    console.error("Protected endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
