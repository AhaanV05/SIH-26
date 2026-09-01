import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/pilots/milestones/route";

describe("Milestones API Route (/api/pilots/milestones)", () => {
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
        actorRole: "PILOT_REVIEWER",
        actorId: "USR-REV-1",
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
});
