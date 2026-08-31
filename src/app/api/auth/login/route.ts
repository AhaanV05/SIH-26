/**
 * POST /api/auth/login
 *
 * Login endpoint for demo authentication.
 * Accepts a demoRole parameter and creates a session for that demo user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSession, DEMO_ROLE_TO_USER_ID } from "@/platform/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { demoRole?: unknown };
    const { demoRole } = body;

    if (typeof demoRole !== "string") {
      return NextResponse.json({ error: "Missing demoRole parameter" }, { status: 400 });
    }

    // Get the user ID for this demo role
    const userId = DEMO_ROLE_TO_USER_ID[demoRole];
    if (!userId) {
      return NextResponse.json(
        { error: `Invalid demo role: ${demoRole}` },
        { status: 400 },
      );
    }

    // Create a session
    const sessionId = await createSession(userId);

    // Return response with session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("sid", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 },
    );
  }
}
