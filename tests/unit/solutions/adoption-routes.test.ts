import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeRouteRequest } = vi.hoisted(() => ({
  authorizeRouteRequest: vi.fn(),
}));

vi.mock("@/platform/route-authorization", () => ({
  authorizeRouteRequest,
}));

import { GET, POST } from "@/app/api/solutions/adoption/route";
import {
  assessTransferability,
  type TransferabilityFactorInput,
} from "@/modules/solutions";

const sampleFactors: TransferabilityFactorInput[] = [
  { key: "problemSimilarity", score: 0.9, rationale: "Match.", evidenceIds: ["E1"], gaps: [], constraint: "NONE" },
  { key: "operatingContextFit", score: 0.7, rationale: "Fit.", evidenceIds: ["E2"], gaps: [], constraint: "NONE" },
  { key: "dataFit", score: 0.85, rationale: "Data.", evidenceIds: ["E3"], gaps: [], constraint: "NONE" },
  { key: "integrationFit", score: 0.8, rationale: "API.", evidenceIds: ["E4"], gaps: [], constraint: "NONE" },
  { key: "scaleFit", score: 0.75, rationale: "Scale.", evidenceIds: ["E5"], gaps: [], constraint: "NONE" },
  { key: "evidenceStrength", score: 0.9, rationale: "Evidence.", evidenceIds: ["E6"], gaps: [], constraint: "NONE" },
  { key: "evidenceFreshness", score: 0.95, rationale: "Fresh.", evidenceIds: ["E7"], gaps: [], constraint: "NONE" },
  { key: "localizationCostFit", score: 0.8, rationale: "Cost.", evidenceIds: ["E8"], gaps: [], constraint: "NONE" },
];

const testAssessment = assessTransferability({
  assessmentId: "ASSESS-TEST-001",
  solutionCardId: "SOLUTION-WASTE-001",
  sourceContextId: "DEPT-PUNE-SWM",
  targetContextId: "DEPT-SATARA-SERVICES",
  synthetic: true,
  displayLabel: "Synthetic demonstration data",
  factors: sampleFactors,
});

describe("Adoption API Route (/api/solutions/adoption)", () => {
  beforeEach(() => {
    authorizeRouteRequest.mockReset();
    authorizeRouteRequest.mockResolvedValue({
      authorized: true,
      user: { id: "USR-PRAKASH-WAGH", name: "Prakash Wagh" },
      actor: {
        id: "USR-PRAKASH-WAGH",
        membershipRole: "PROBLEM_OWNER",
        organizationId: "ORG-GOV",
      },
    });
  });

  it("GET returns initial adoption request snapshot", async () => {
    const request = new Request("http://localhost:3000/api/solutions/adoption?requestId=ADOPT-TEST-GET-01");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.snapshot.requestId).toBe("ADOPT-TEST-GET-01");
    expect(body.snapshot.state).toBe("DRAFT");
  });

  it("POST transitions adoption request state and emits audit event", async () => {
    const request = new Request("http://localhost:3000/api/solutions/adoption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "ADOPT-TEST-POST-01",
        expectedVersion: 0,
        to: "ASSESSMENT_READY",
        actorRole: "TRANSFERABILITY_RULE_ENGINE",
        actorId: "USR-SPOOFED-ENGINE",
        reason: "Context fit evaluation completed with recommendation to run localized micro-pilot.",
        assessment: {
          ...testAssessment,
          score: 0,
          recommendation: "NOT_CURRENTLY_TRANSFERABLE",
          advisoryOnly: false,
          humanAuthorizationRequired: false,
        },
        solutionCardId: "SOLUTION-WASTE-001",
        targetDepartmentId: "DEPT-SATARA-SERVICES",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.snapshot.state).toBe("ASSESSMENT_READY");
    expect(body.snapshot.version).toBe(1);
    expect(body.snapshot.recommendation).toBe(testAssessment.recommendation);
    expect(body.auditEvent).toBeDefined();
    expect(body.auditEvent.action).toBe("ADOPTION_STATE_ASSESSMENT_READY");
    expect(body.auditEvent.actor.id).toBe("USR-PRAKASH-WAGH");
    expect(body.auditEvent.actor.role).toBe("PROBLEM_OWNER");
    expect(body.auditEvent.metadata.workflowActorRole).toBe("TRANSFERABILITY_RULE_ENGINE");
  });

  it("POST rejects unauthorized roles or illegal transitions", async () => {
    const request = new Request("http://localhost:3000/api/solutions/adoption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "ADOPT-TEST-POST-02",
        expectedVersion: 0,
        to: "AUTHORIZED", // Cannot jump directly from DRAFT to AUTHORIZED
        actorRole: "PROCUREMENT_REVIEWER",
        actorId: "USR-REV-1",
        reason: "Bypass attempt should fail.",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("POST derives the final procurement authorization actor from the session", async () => {
    const requestId = "ADOPT-TEST-AUTHORIZED-01";
    const post = (body: Record<string, unknown>) => POST(new Request(
      "http://localhost:3000/api/solutions/adoption",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, ...body }),
      },
    ));

    expect((await post({
      expectedVersion: 0,
      to: "ASSESSMENT_READY",
      actorRole: "PROCUREMENT_REVIEWER",
      actorId: "USR-SPOOFED",
      reason: "Assessment generated by deterministic rules.",
      assessment: testAssessment,
    })).status).toBe(200);
    expect((await post({
      expectedVersion: 1,
      to: "SUBMITTED_FOR_AUTHORIZATION",
      actorRole: "PROCUREMENT_REVIEWER",
      actorId: "USR-SPOOFED",
      reason: "Problem owner submitted the recommendation.",
    })).status).toBe(200);

    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: true,
      user: { id: "USR-RAHUL-KULKARNI", name: "Rahul Kulkarni" },
      actor: {
        id: "USR-RAHUL-KULKARNI",
        membershipRole: "PROCUREMENT_REVIEWER",
        organizationId: "ORG-GOV",
      },
    });
    const response = await post({
      expectedVersion: 2,
      to: "AUTHORIZED",
      actorRole: "STARTUP_CONTRIBUTOR",
      actorId: "USR-SPOOFED-STARTUP",
      reason: "Procurement reviewer authorized the synthetic micro-pilot route.",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.state).toBe("AUTHORIZED");
    expect(body.auditEvent.actor).toMatchObject({
      id: "USR-RAHUL-KULKARNI",
      role: "PROCUREMENT_REVIEWER",
    });
  });

  it("POST rejects a startup claiming procurement authority", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions." },
        { status: 403 },
      ),
    });
    const response = await POST(new Request("http://localhost:3000/api/solutions/adoption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "ADOPT-DENIED-01",
        expectedVersion: 0,
        to: "AUTHORIZED",
        actorRole: "PROCUREMENT_REVIEWER",
        actorId: "USR-RAHUL-KULKARNI",
        reason: "Spoofed procurement authorization.",
      }),
    }));

    expect(response.status).toBe(403);
  });
});
