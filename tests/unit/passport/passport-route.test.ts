import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { readSession } = vi.hoisted(() => ({ readSession: vi.fn() }));
vi.mock("@/platform/session", () => ({ readSession }));

import { GET, POST } from "@/app/api/passport/route";

function request(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/passport${query}`, { headers: { cookie: "sid=test" } });
}

describe("passport API", () => {
  beforeEach(() => readSession.mockReset());

  it("requires an authenticated supported actor", async () => {
    readSession.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    readSession.mockResolvedValue({ userId: "unknown" });
    expect((await GET(request())).status).toBe(403);
    readSession.mockResolvedValue({ userId: "USR-SUNITA-RANE" });
    expect((await GET(request())).status).toBe(403);
  });

  it("returns the startup's own simulated passport", async () => {
    readSession.mockResolvedValue({ userId: "USR-ADITI-KULKARNI" });
    const response = await GET(request());
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.passport).toMatchObject({ startupId: "ORG-ECOSCAN", displayLabel: "SIMULATED_FOR_DEMO" });
    expect(payload.persisted).toBe(false);
  });

  it("does not allow a startup to request a competitor passport", async () => {
    readSession.mockResolvedValue({ userId: "USR-ADITI-KULKARNI" });
    expect((await GET(request("?startupId=ORG-BINSENSE"))).status).toBe(403);
  });

  it("allows only an authorized officer to run simulated verification", async () => {
    readSession.mockResolvedValue({ userId: "USR-ADITI-KULKARNI" });
    const startupRequest = new NextRequest("http://localhost/api/passport", {
      method: "POST", headers: { cookie: "sid=test", "content-type": "application/json" },
      body: JSON.stringify({ evidenceId: "CRED-ECOSCAN-DPIIT" }),
    });
    expect((await POST(startupRequest)).status).toBe(403);

    readSession.mockResolvedValue({ userId: "USR-RAHUL-KULKARNI" });
    const reviewerRequest = new NextRequest("http://localhost/api/passport", {
      method: "POST", headers: { cookie: "sid=test", "content-type": "application/json" },
      body: JSON.stringify({ evidenceId: "CRED-ECOSCAN-DPIIT" }),
    });
    const response = await POST(reviewerRequest);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ persisted: false, displayLabel: "SIMULATED_FOR_DEMO" });
    expect(payload.evidence).toMatchObject({ assuranceLevel: "OFFICER_VERIFIED", synthetic: true });
  });
});
