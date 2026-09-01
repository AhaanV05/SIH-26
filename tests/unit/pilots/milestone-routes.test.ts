import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeRouteRequest } = vi.hoisted(() => ({
  authorizeRouteRequest: vi.fn(),
}));

vi.mock("@/platform/route-authorization", () => ({
  authorizeRouteRequest,
}));

import { GET, POST } from "@/app/api/pilots/milestones/route";

describe("Milestones API Route (/api/pilots/milestones)", () => {
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

  it("GET returns initial snapshot for milestone", async () => {
    const request = new Request("http://localhost:3000/api/pilots/milestones?milestoneId=MS-TEST-01");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.snapshot.milestoneId).toBe("MS-TEST-01");
    expect(body.snapshot.state).toBe("PLANNED");
  });

  it("POST transitions milestone state and generates audit record", async () => {
    const request = new Request("http://localhost:3000/api/pilots/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneId: "MS-TEST-ROUTE-01",
        expectedVersion: 0,
        to: "IN_PROGRESS",
        actorRole: "STARTUP_CONTRIBUTOR",
        actorId: "USR-SPOOFED-REVIEWER",
        reason: "Sandbox deployment initiated for Ward 12.",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.snapshot.state).toBe("IN_PROGRESS");
    expect(body.snapshot.version).toBe(1);
    expect(body.auditEvent).toBeDefined();
    expect(body.auditEvent.action).toBe("MILESTONE_STATE_IN_PROGRESS");
    expect(body.auditEvent.actor).toMatchObject({
      id: "USR-ANJALI-DESHMUKH",
      role: "PROBLEM_OWNER",
    });
    expect(body.auditEvent.metadata.workflowActorRole).toBe("PILOT_REVIEWER");
  });

  it("POST returns 400 on invalid transition or missing fields", async () => {
    const request = new Request("http://localhost:3000/api/pilots/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneId: "MS-TEST-ROUTE-02",
        expectedVersion: 0,
        to: "ACCEPTED", // invalid directly from PLANNED
        actorRole: "PILOT_REVIEWER",
        reason: "Direct acceptance should fail.",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("POST rejects startup role spoofing before creating milestone state", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions." },
        { status: 403 },
      ),
    });
    const response = await POST(new Request("http://localhost:3000/api/pilots/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneId: "MS-DENIED-STARTUP-01",
        expectedVersion: 0,
        to: "ACCEPTED",
        actorRole: "PILOT_REVIEWER",
        actorId: "USR-ANJALI-DESHMUKH",
        reason: "Spoofed reviewer acceptance.",
      }),
    }));

    expect(response.status).toBe(403);
  });

  it("uses a server-owned readiness fixture instead of a caller-supplied engine result", async () => {
    const milestoneId = "MS-SERVER-RULES-01";
    const post = (body: Record<string, unknown>) => POST(new Request(
      "http://localhost:3000/api/pilots/milestones",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, ...body }),
      },
    ));

    expect((await post({
      expectedVersion: 0,
      to: "IN_PROGRESS",
      reason: "Authorized reviewer started the pilot.",
    })).status).toBe(200);

    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: true,
      user: { id: "USR-ROHAN-BHATT", name: "Rohan Bhatt" },
      actor: {
        id: "USR-ROHAN-BHATT",
        membershipRole: "STARTUP_CONTRIBUTOR",
        organizationId: "ORG-ECOSCAN",
      },
    });
    expect((await post({
      expectedVersion: 1,
      to: "EVIDENCE_SUBMITTED",
      actorRole: "EVIDENCE_RULE_ENGINE",
      evidenceObjectIds: ["EVID-SYNTHETIC-01"],
      reason: "Startup submitted the synthetic evidence packet.",
    })).status).toBe(200);

    const response = await post({
      expectedVersion: 2,
      to: "READY_FOR_HUMAN_ACCEPTANCE",
      actorRole: "EVIDENCE_RULE_ENGINE",
      actorId: "USR-SPOOFED-ENGINE",
      reason: "Run deterministic readiness rules.",
      acceptanceEvaluation: {
        id: "FORGED-EVALUATION-ID",
        milestoneId,
        status: "READY_FOR_HUMAN_ACCEPTANCE",
        rulesSatisfied: true,
        humanAuthorizationRequired: true,
        automaticAcceptancePerformed: false,
        metricEvaluations: [],
        evidenceEvaluations: [],
        blockerCodes: [],
        summary: "Caller-forged readiness.",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot.acceptanceEvaluationId).toBe(`SIM-EVAL-${milestoneId}-V2`);
    expect(body.snapshot.acceptanceEvaluationId).not.toBe("FORGED-EVALUATION-ID");
    expect(body.auditEvent.actor.role).toBe("PROBLEM_OWNER");
    expect(body.auditEvent.metadata.workflowActorRole).toBe("EVIDENCE_RULE_ENGINE");
  });

  it("POST rejects a missing session with 401", async () => {
    authorizeRouteRequest.mockResolvedValueOnce({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      ),
    });
    const response = await POST(new Request("http://localhost:3000/api/pilots/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneId: "MS-NO-SESSION-01",
        expectedVersion: 0,
        to: "IN_PROGRESS",
        reason: "No session.",
      }),
    }));

    expect(response.status).toBe(401);
  });
});
