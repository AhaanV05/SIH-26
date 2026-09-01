import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/solutions/transferability/route";
import type { TransferabilityFactorInput } from "@/modules/solutions";

const testFactors: TransferabilityFactorInput[] = [
  { key: "problemSimilarity", score: 0.9, rationale: "High similarity.", evidenceIds: ["E1"], gaps: [], constraint: "NONE" },
  { key: "operatingContextFit", score: 0.6, rationale: "Moderate fit.", evidenceIds: ["E2"], gaps: [], constraint: "LOCALIZED_MICRO_PILOT_REQUIRED" },
  { key: "dataFit", score: 0.8, rationale: "Good mapping.", evidenceIds: ["E3"], gaps: [], constraint: "NONE" },
  { key: "integrationFit", score: 0.7, rationale: "API compatible.", evidenceIds: ["E4"], gaps: [], constraint: "NONE" },
  { key: "scaleFit", score: 0.8, rationale: "Scale aligned.", evidenceIds: ["E5"], gaps: [], constraint: "NONE" },
  { key: "evidenceStrength", score: 0.9, rationale: "Strong evidence.", evidenceIds: ["E6"], gaps: [], constraint: "NONE" },
  { key: "evidenceFreshness", score: 0.95, rationale: "Fresh data.", evidenceIds: ["E7"], gaps: [], constraint: "NONE" },
  { key: "localizationCostFit", score: 0.7, rationale: "Low cost.", evidenceIds: ["E8"], gaps: [], constraint: "NONE" },
];

describe("Transferability API Route (/api/solutions/transferability)", () => {
  it("GET returns standard demo transferability assessment", async () => {
    const request = new Request("http://localhost:3000/api/solutions/transferability?solutionCardId=SOL-1");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.assessment).toBeDefined();
    expect(body.assessment.score).toBeGreaterThan(0);
    expect(body.assessment.recommendation).toBeDefined();
    expect(body.assessment.factors.length).toBe(8);
  });

  it("POST computes 8-factor score contribution and logs audit record", async () => {
    const request = new Request("http://localhost:3000/api/solutions/transferability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentInput: {
          assessmentId: "ASSESS-TEST-POST-01",
          solutionCardId: "SOL-1",
          sourceContextId: "PUNE",
          targetContextId: "SATARA",
          synthetic: true,
          displayLabel: "Synthetic demonstration data",
          factors: testFactors,
        },
        actorId: "USR-ANALYST-1",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.assessment.score).toBeGreaterThan(0);
    expect(body.assessment.recommendation).toBe("RUN_LOCALIZED_MICRO_PILOT");
    expect(body.auditEvent).toBeDefined();
    expect(body.auditEvent.action).toBe("TRANSFERABILITY_ASSESSMENT_EVALUATED");
  });

  it("POST returns 400 when missing factors", async () => {
    const request = new Request("http://localhost:3000/api/solutions/transferability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});
