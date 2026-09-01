import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { readSession } = vi.hoisted(() => ({ readSession: vi.fn() }));
vi.mock("@/platform/session", () => ({ readSession }));

import { GET, POST } from "@/app/api/proposals/route";

function request(method = "GET", body?: unknown, query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/proposals${query}`, {
    method,
    headers: { cookie: "sid=test", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const validBody = {
  challengeId: "CHAL-WASTE-PUNE-001",
  startupId: "ORG-ECOSCAN",
  approach: "A sufficiently detailed approach that explains edge inference, encrypted synchronization, open APIs, and an operational fallback.",
  outcomes: "Detect at least ninety percent of overflow events and reduce median dispatch time below twenty minutes.",
  timeline: [{ phase: "Sandbox benchmark", weeks: 2 }],
  pilotCostInPaise: 18_500_000,
  risks: "Camera occlusion is mitigated with confidence thresholds and manual fallback.",
  declarationsAccepted: true,
  submit: true,
};

describe("proposal API", () => {
  beforeEach(() => readSession.mockReset());

  it("returns only the authenticated startup's proposals", async () => {
    readSession.mockResolvedValue({ userId: "USR-ADITI-KULKARNI" });
    const response = await GET(request());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.proposals).toHaveLength(1);
    expect(payload.proposals[0].startupId).toBe("ORG-ECOSCAN");
  });

  it("returns 403 when a startup reads another proposal directly", async () => {
    readSession.mockResolvedValue({ userId: "USR-ADITI-KULKARNI" });
    expect((await GET(request("GET", undefined, "?id=PROP-BINSENSE-001"))).status).toBe(403);
    readSession.mockResolvedValue({ userId: "USR-SUNITA-RANE" });
    expect((await GET(request())).status).toBe(403);
  });

  it("validates and submits an owned proposal without claiming persistence", async () => {
    readSession.mockResolvedValue({ userId: "USR-ADITI-KULKARNI" });
    const response = await POST(request("POST", validBody));
    const payload = await response.json();
    expect(response.status).toBe(201);
    expect(payload.proposal).toMatchObject({ startupId: "ORG-ECOSCAN", status: "SUBMITTED", displayLabel: "SIMULATED_FOR_DEMO" });
    expect(payload.persisted).toBe(false);
  });

  it("rejects another startup identity and invalid inputs", async () => {
    readSession.mockResolvedValue({ userId: "USR-ADITI-KULKARNI" });
    expect((await POST(request("POST", { ...validBody, startupId: "ORG-BINSENSE" }))).status).toBe(403);
    expect((await POST(request("POST", { ...validBody, approach: "short" }))).status).toBe(400);
  });
});
