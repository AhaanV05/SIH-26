import { NextRequest, NextResponse } from "next/server";

import { getDemoRoleForUserId, getSessionUser } from "@/platform/auth";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get("sid")?.value;
  const user = await getSessionUser(sessionId);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const demoRole = getDemoRoleForUserId(user.id);

  return NextResponse.json({
    authenticated: true,
    demoRole,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}
