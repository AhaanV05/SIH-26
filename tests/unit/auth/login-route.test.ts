import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createSession } = vi.hoisted(() => ({
  createSession: vi.fn(async () => "signed-demo-session"),
}));

vi.mock("@/platform/auth", () => ({
  createSession,
  DEMO_ROLE_TO_USER_ID: {
    "problem-owner": "USR-ANJALI-DESHMUKH",
  },
}));

import { POST } from "@/app/api/auth/login/route";

function loginRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("demo login endpoint", () => {
  beforeEach(() => {
    createSession.mockClear();
  });

  it("creates an httpOnly session cookie for a known demo role", async () => {
    const response = await POST(loginRequest({ demoRole: "problem-owner" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(createSession).toHaveBeenCalledWith("USR-ANJALI-DESHMUKH");
    expect(response.cookies.get("sid")?.value).toBe("signed-demo-session");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects absent, non-string, and unknown roles without creating a session", async () => {
    for (const body of [{}, { demoRole: 42 }, { demoRole: "not-a-role" }]) {
      const response = await POST(loginRequest(body));
      expect(response.status).toBe(400);
    }

    expect(createSession).not.toHaveBeenCalled();
  });
});
