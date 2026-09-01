import { describe, expect, it } from "vitest";
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
        actorId: "USR-ENGINE-1",
        reason: "Context fit evaluation completed with recommendation to run localized micro-pilot.",
        assessment: testAssessment,
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
    expect(body.auditEvent).toBeDefined();
    expect(body.auditEvent.action).toBe("ADOPTION_STATE_ASSESSMENT_READY");
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
});
