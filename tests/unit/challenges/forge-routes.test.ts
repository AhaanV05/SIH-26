import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeRouteRequest } = vi.hoisted(() => ({
  authorizeRouteRequest: vi.fn(),
}));

vi.mock("@/platform/route-authorization", () => ({
  authorizeRouteRequest,
}));

import { POST as compileRoute } from "@/app/api/challenges/compile/route";
import { POST as freezeRoute } from "@/app/api/challenges/freeze/route";
import { verifyChallengeSpecContentHash } from "@/modules/challenges";

const intake = {
  problemStatement:
    "Bins overflow for hours before ward teams know, and the solution must use AI and Microsoft Azure for every alert.",
  department: "Urban Development Department",
  geography: "Pune, Maharashtra",
};

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function compiledSpecification(acceptedRemediationCodes: string[] = []) {
  const response = await compileRoute(
    post("/api/challenges/compile", { ...intake, acceptedRemediationCodes }),
  );
  expect(response.status).toBe(200);
  return (await response.json()).specification;
}

describe("Challenge Forge command routes", () => {
  beforeEach(() => {
    authorizeRouteRequest.mockReset();
    authorizeRouteRequest.mockResolvedValue({
      authorized: true,
      user: { id: "USR-ANJALI-DESHMUKH", name: "Anjali Deshmukh" },
      actor: {
        id: "USR-ANJALI-DESHMUKH",
        membershipRole: "PROBLEM_OWNER",
        organizationId: "ORG-GOV",
      },
    });
  });

  it("rejects an unauthenticated freeze before trusting body assertions", async () => {
    const specification = await compiledSpecification(["MS-PROC-005"]);
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      ),
    });
    const response = await freezeRoute(
      post("/api/challenges/freeze", {
        specification,
        humanApproved: true,
        approverName: "Spoofed Reviewer",
        satisfiedApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects a freeze while procurement findings remain open", async () => {
    const specification = await compiledSpecification();
    const response = await freezeRoute(
      post("/api/challenges/freeze", {
        specification,
        humanApproved: true,
        approverName: "Anjali Deshmukh",
      }),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).findingCodes).toContain("MS-PROC-005");
  });

  it("freezes a remediated human-approved specification without publishing it", async () => {
    const specification = await compiledSpecification(["MS-PROC-005"]);
    const response = await freezeRoute(
      post("/api/challenges/freeze", {
        specification,
        humanApproved: true,
        approverName: "Spoofed Caller Name",
        satisfiedApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
        frozenAt: "2026-09-01T10:00:00+05:30",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("FROZEN_NOT_PUBLISHED");
    expect(body.humanAuthorizationRecorded).toBe(true);
    expect(body.approvedBy).toBe("Anjali Deshmukh");
    expect(body.approvedByUserId).toBe("USR-ANJALI-DESHMUKH");
    expect(body.approvedByMembershipRole).toBe("PROBLEM_OWNER");
    expect(body.approvalBasis).toBe("SIMULATED_FOR_DEMO_SERVER_FIXTURE");
    expect(body.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyChallengeSpecContentHash(body.specification)).toBe(true);
  });

  it("rejects a startup even when the body claims every approver role", async () => {
    const specification = await compiledSpecification(["MS-PROC-005"]);
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions." },
        { status: 403 },
      ),
    });
    const response = await freezeRoute(
      post("/api/challenges/freeze", {
        specification,
        humanApproved: true,
        approverName: "Startup Pretending To Review",
        satisfiedApproverRoles: ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"],
        frozenAt: "2026-09-01T10:00:00+05:30",
      }),
    );

    expect(response.status).toBe(403);
  });
});
