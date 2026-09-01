import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeRouteRequest } = vi.hoisted(() => ({
  authorizeRouteRequest: vi.fn(),
}));

vi.mock("@/platform/route-authorization", () => ({
  authorizeRouteRequest,
}));

import { GET, POST } from "@/app/api/evaluations/route";
import { DEMO_DEFAULT_SCORES } from "@/modules/evaluations";

describe("Evaluations API Route (/api/evaluations)", () => {
  beforeEach(() => {
    authorizeRouteRequest.mockReset();
    authorizeRouteRequest.mockResolvedValue({
      authorized: true,
      user: { id: "USR-FARHAN-SHEIKH", name: "Farhan Sheikh" },
      actor: {
        id: "USR-FARHAN-SHEIKH",
        membershipRole: "EVALUATOR",
        organizationId: "ORG-PLATFORM",
      },
    });
  });

  it("GET returns rubric, assignments, submissions, advisories, and audit count", async () => {
    const request = new Request("http://localhost:3000/api/evaluations?proposalId=PROP-ECOSCAN");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.proposalId).toBe("PROP-ECOSCAN");
    expect(body.rubric).toBeDefined();
    expect(body.assignment).toBeDefined();
    expect(Array.isArray(body.submissions)).toBe(true);
    expect(Array.isArray(body.advisories)).toBe(true);
  });

  it("POST DECLARE_CONFLICT processes no-conflict declaration and creates audit event", async () => {
    const request = new Request("http://localhost:3000/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "DECLARE_CONFLICT",
        actor: { id: "USR-SPOOFED-EVALUATOR", role: "PROCUREMENT_REVIEWER" },
        hasConflict: false,
        declaredAt: "2026-08-10T10:00:00.000Z",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.assignment.status).toBe("READY_TO_SCORE");
    expect(body.auditEvent).toBeDefined();
    expect(body.auditEvent.action).toBe("EVALUATOR_CLEARED_NO_CONFLICT");
    expect(body.auditEvent.actor).toMatchObject({
      id: "USR-FARHAN-SHEIKH",
      role: "EVALUATOR",
    });
  });

  it("POST SUBMIT_EVALUATION records scores and creates audit event", async () => {
    const request = new Request("http://localhost:3000/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SUBMIT_EVALUATION",
        actor: { id: "USR-SPOOFED-EVALUATOR", role: "PROCUREMENT_REVIEWER" },
        scores: DEMO_DEFAULT_SCORES,
        submittedAt: "2026-08-10T11:00:00.000Z",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.assignment.status).toBe("SUBMITTED");
    expect(body.submission.weightedScore).toBeGreaterThan(0);
    expect(body.auditEvent.action).toBe("INDEPENDENT_EVALUATION_SUBMITTED");
    expect(body.submission.evaluatorId).toBe("USR-FARHAN-SHEIKH");
  });

  it("POST MODERATE_PROPOSAL records selection decision and creates audit event", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: true,
      user: { id: "USR-RAHUL-KULKARNI", name: "Rahul Kulkarni" },
      actor: {
        id: "USR-RAHUL-KULKARNI",
        membershipRole: "PROCUREMENT_REVIEWER",
        organizationId: "ORG-GOV",
      },
    });
    const request = new Request("http://localhost:3000/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "MODERATE_PROPOSAL",
        actor: { id: "USR-SPOOFED", role: "PROBLEM_OWNER" },
        proposalId: "PROP-ECOSCAN",
        decision: "SELECTED",
        rationale: "Selected for pilot sandbox execution based on superior technical capability fit and verified security credentials.",
        decidedAt: "2026-08-10T14:00:00.000Z",
        advisoryReviews: [
          {
            advisoryId: "ADV-R-3-DIVERGENCE",
            disposition: "EXPLAINED",
            reason: "Reviewed difference in security score; validated by third-party testing report.",
          },
        ],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.decision.decision).toBe("SELECTED");
    expect(body.decision.humanAuthorized).toBe(true);
    expect(body.decision.decidedBy).toBe("USR-RAHUL-KULKARNI");
    expect(body.decision.decidedByRole).toBe("PROCUREMENT_REVIEWER");
    expect(body.auditEvent.action).toBe("PROPOSAL_MODERATION_SELECTED");
  });

  it("POST returns 400 when missing action", async () => {
    const request = new Request("http://localhost:3000/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("POST rejects an evaluator who claims procurement authority in the body", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions." },
        { status: 403 },
      ),
    });
    const request = new Request("http://localhost:3000/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "MODERATE_PROPOSAL",
        actor: { id: "USR-RAHUL-KULKARNI", role: "PROCUREMENT_REVIEWER" },
        proposalId: "PROP-ECOSCAN",
        decision: "SELECTED",
        rationale: "Should fail because evaluators cannot moderate.",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Insufficient permissions.");
  });

  it("POST rejects a missing session with 401", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      ),
    });
    const response = await POST(new Request("http://localhost:3000/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DECLARE_CONFLICT", hasConflict: false }),
    }));

    expect(response.status).toBe(401);
  });
});
