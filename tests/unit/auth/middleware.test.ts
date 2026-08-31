import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { readSession } = vi.hoisted(() => ({ readSession: vi.fn() }));

vi.mock("../../../src/platform/session", () => ({ readSession }));

import { middleware } from "../../../middleware";

function request(pathname: string, sessionId?: string): NextRequest {
  const headers = sessionId ? { cookie: `sid=${sessionId}` } : undefined;
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

describe("authentication middleware", () => {
  beforeEach(() => {
    readSession.mockReset();
  });

  it("allows login without a session", async () => {
    const response = await middleware(request("/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects an unauthenticated page request to login", async () => {
    const response = await middleware(request("/pilots"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("returns JSON 401 for an unauthenticated protected API request", async () => {
    const response = await middleware(request("/api/protected/example"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("clears an invalid cookie before redirecting", async () => {
    readSession.mockResolvedValue(null);

    const response = await middleware(request("/challenges", "invalid-session"));
    expect(response.status).toBe(307);
    expect(response.cookies.get("sid")?.value).toBe("");
  });
});
