import type { MembershipRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/platform/auth";

const { getSessionUser } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/platform/auth", () => ({
  getSessionUser,
}));

import { authorizeRouteRequest } from "@/platform/route-authorization";

function membership(
  role: MembershipRole,
  organizationId: string,
  userId = "USR-SERVER-ACTOR",
): SessionUser["memberships"][number] {
  return {
    id: `MEM-${role}`,
    userId,
    organizationId,
    role,
    activeFrom: new Date("2026-01-01T00:00:00.000Z"),
    activeTo: null,
  };
}

function sessionUser(
  memberships: SessionUser["memberships"],
  id = "USR-SERVER-ACTOR",
): SessionUser {
  return {
    id,
    name: "Server Actor",
    email: "server.actor@example.test",
    locale: "en-IN",
    status: "ACTIVE",
    memberships,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function request(cookie?: string): Request {
  return new Request("http://localhost/api/protected", {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("route authorization", () => {
  beforeEach(() => {
    getSessionUser.mockReset();
  });

  it("returns 401 when the session cookie is missing", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await authorizeRouteRequest(request(), ["PROBLEM_OWNER"]);

    expect(getSessionUser).toHaveBeenCalledWith(undefined);
    expect(result.authorized).toBe(false);
    if (result.authorized) throw new Error("Expected authorization failure");
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({
      success: false,
      error: "Authentication required.",
    });
  });

  it("treats a malformed encoded session cookie as unauthenticated", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await authorizeRouteRequest(
      request("theme=dark; sid=%E0%A4%A; locale=en-IN"),
      ["PROBLEM_OWNER"],
    );

    expect(getSessionUser).toHaveBeenCalledWith(undefined);
    expect(result.authorized).toBe(false);
    if (result.authorized) throw new Error("Expected authorization failure");
    expect(result.response.status).toBe(401);
  });

  it("returns 401 when the signed session is invalid or inactive", async () => {
    getSessionUser.mockResolvedValue(null);

    const result = await authorizeRouteRequest(request("sid=invalid-session"), [
      "PROBLEM_OWNER",
    ]);

    expect(getSessionUser).toHaveBeenCalledWith("invalid-session");
    expect(result.authorized).toBe(false);
    if (result.authorized) throw new Error("Expected authorization failure");
    expect(result.response.status).toBe(401);
  });

  it("returns 403 when the authenticated user has no allowed membership", async () => {
    getSessionUser.mockResolvedValue(
      sessionUser([membership("EVALUATOR", "ORG-EVALUATION")]),
    );

    const result = await authorizeRouteRequest(request("sid=valid-session"), [
      "FINANCE_OFFICER",
    ]);

    expect(result.authorized).toBe(false);
    if (result.authorized) throw new Error("Expected authorization failure");
    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toEqual({
      success: false,
      error: "Insufficient permissions.",
    });
  });

  it("returns an actor derived from the server-loaded user and membership", async () => {
    getSessionUser.mockResolvedValue(
      sessionUser([membership("FINANCE_OFFICER", "ORG-FINANCE")]),
    );

    const result = await authorizeRouteRequest(
      request("theme=dark; sid=signed%2Esession%3Dvalue"),
      ["FINANCE_OFFICER"],
    );

    expect(getSessionUser).toHaveBeenCalledWith("signed.session=value");
    expect(result).toMatchObject({
      authorized: true,
      actor: {
        id: "USR-SERVER-ACTOR",
        membershipRole: "FINANCE_OFFICER",
        organizationId: "ORG-FINANCE",
      },
      user: { id: "USR-SERVER-ACTOR" },
    });
  });

  it("uses allowed-role order when several active memberships match", async () => {
    getSessionUser.mockResolvedValue(
      sessionUser([
        membership("PLATFORM_ADMIN", "ORG-PLATFORM"),
        membership("AUDITOR", "ORG-AUDIT"),
      ]),
    );

    const result = await authorizeRouteRequest(request("sid=valid-session"), [
      "AUDITOR",
      "PLATFORM_ADMIN",
    ]);

    expect(result).toMatchObject({
      authorized: true,
      actor: {
        membershipRole: "AUDITOR",
        organizationId: "ORG-AUDIT",
      },
    });
  });
});
