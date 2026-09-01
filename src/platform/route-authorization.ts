import type { MembershipRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSessionUser, type SessionUser } from "./auth";

export type AuthorizedRouteActor = {
  id: string;
  membershipRole: MembershipRole;
  organizationId: string;
};

export type RouteAuthorizationResult =
  | {
      authorized: true;
      user: SessionUser;
      actor: AuthorizedRouteActor;
    }
  | {
      authorized: false;
      response: NextResponse;
    };

function sessionIdFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = cookie.slice(0, separatorIndex).trim();
    if (name !== "sid") continue;

    const encodedValue = cookie.slice(separatorIndex + 1).trim();
    if (!encodedValue) return undefined;

    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Authenticate a route request and derive its actor solely from an active,
 * server-loaded membership. The caller controls which membership roles may
 * perform the route action; request bodies never supply actor identity or role.
 */
export async function authorizeRouteRequest(
  request: Request,
  allowedRoles: readonly MembershipRole[],
): Promise<RouteAuthorizationResult> {
  const user = await getSessionUser(sessionIdFromRequest(request));

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  for (const role of allowedRoles) {
    const membership = user.memberships.find((candidate) => candidate.role === role);
    if (membership) {
      return {
        authorized: true,
        user,
        actor: {
          id: user.id,
          membershipRole: membership.role,
          organizationId: membership.organizationId,
        },
      };
    }
  }

  return {
    authorized: false,
    response: NextResponse.json(
      { success: false, error: "Insufficient permissions." },
      { status: 403 },
    ),
  };
}
