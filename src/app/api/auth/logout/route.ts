/**
 * POST /api/auth/logout
 *
 * Logout endpoint for demo authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/platform/auth";

export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionId = request.cookies.get("sid")?.value;

    if (sessionId) {
      // Clear the session
      clearSession();
    }

    // Return response and clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete("sid");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 },
    );
  }
}
