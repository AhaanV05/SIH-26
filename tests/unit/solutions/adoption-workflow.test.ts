import { describe, expect, it } from "vitest";
import {
  assessTransferability,
  createAdoptionRequest,
  transitionAdoptionRequest,
  type TransferabilityFactorInput,
} from "@/modules/solutions";

const factors: TransferabilityFactorInput[] = [
  ["problemSimilarity", 0.9],
  ["operatingContextFit", 0.65],
  ["dataFit", 0.85],
  ["integrationFit", 0.7],
  ["scaleFit", 0.7],
  ["evidenceStrength", 0.9],
  ["evidenceFreshness", 0.95],
  ["localizationCostFit", 0.55],
].map(([key, score]) => ({
  key: key as TransferabilityFactorInput["key"],
  score: score as number,
  rationale: `${key} assessed from synthetic context evidence`,
  evidenceIds: [`EVIDENCE-${key}`],
  gaps: key === "operatingContextFit" ? ["Intermittent connectivity"] : [],
  constraint:
    key === "operatingContextFit" ? "LOCALIZED_MICRO_PILOT_REQUIRED" : "NONE",
}));

const assessment = assessTransferability({
  assessmentId: "ASSESS-1",
  solutionCardId: "SOLUTION-1",
  sourceContextId: "DEPT-PUNE",
  targetContextId: "DEPT-SATARA",
  factors,
  synthetic: true,
  displayLabel: "Synthetic demonstration data",
});

describe("adoption request workflow", () => {
  it("keeps recommendations advisory until procurement authorization", () => {
    const draft = createAdoptionRequest({
      requestId: "ADOPT-1",
      solutionCardId: "SOLUTION-1",
      targetDepartmentId: "DEPT-SATARA",
    });
    const assessed = transitionAdoptionRequest(draft, {
      expectedVersion: 0,
      to: "ASSESSMENT_READY",
      actorRole: "TRANSFERABILITY_RULE_ENGINE",
      reason: "Transparent factor assessment completed",
      assessment,
    });
    const submitted = transitionAdoptionRequest(assessed, {
      expectedVersion: 1,
      to: "SUBMITTED_FOR_AUTHORIZATION",
      actorRole: "PROBLEM_OWNER",
      reason: "Requested a localized micro-pilot pathway",
    });
    const authorized = transitionAdoptionRequest(submitted, {
      expectedVersion: 2,
      to: "AUTHORIZED",
      actorRole: "PROCUREMENT_REVIEWER",
      reason: "Authorized controlled local discovery; no procurement bypass",
    });

    expect(authorized.recommendation).toBe("RUN_LOCALIZED_MICRO_PILOT");
    expect(authorized.pathwayAuthorizedByHuman).toBe(true);
    expect(authorized.history).toHaveLength(3);
  });

  it("rejects wrong context, roles, and stale versions", () => {
    const draft = createAdoptionRequest({
      requestId: "ADOPT-1",
      solutionCardId: "SOLUTION-1",
      targetDepartmentId: "DEPT-SATARA",
    });

    expect(() =>
      transitionAdoptionRequest(draft, {
        expectedVersion: 0,
        to: "ASSESSMENT_READY",
        actorRole: "PROBLEM_OWNER",
        reason: "Wrong actor",
        assessment,
      }),
    ).toThrow("cannot move");

    expect(() =>
      transitionAdoptionRequest(draft, {
        expectedVersion: 1,
        to: "ASSESSMENT_READY",
        actorRole: "TRANSFERABILITY_RULE_ENGINE",
        reason: "Stale version",
        assessment,
      }),
    ).toThrow("expected 1");

    expect(() =>
      transitionAdoptionRequest(draft, {
        expectedVersion: 0,
        to: "ASSESSMENT_READY",
        actorRole: "TRANSFERABILITY_RULE_ENGINE",
        reason: "Wrong target",
        assessment: { ...assessment, targetContextId: "DEPT-NASHIK" },
      }),
    ).toThrow("different target department");
  });
});
