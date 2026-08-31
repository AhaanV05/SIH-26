import { describe, expect, it } from "vitest";

import transferabilityFixture from "../../../data/fixtures/synthetic-transferability.v1.json";
import {
  TRANSFERABILITY_METHOD_VERSION,
  assessTransferability,
  type TransferabilityAssessmentInput,
} from "../../../src/modules/solutions";

const scenarios = transferabilityFixture.scenarios as unknown as Record<
  string,
  TransferabilityAssessmentInput
>;

describe("transparent transferability assessment", () => {
  it("recommends evidence reuse for a strong contextual fit", () => {
    const assessment = assessTransferability(scenarios.strongFit!);

    expect(assessment.methodVersion).toBe(TRANSFERABILITY_METHOD_VERSION);
    expect(assessment.score).toBe(0.89);
    expect(assessment.recommendation).toBe(
      "REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT",
    );
    expect(assessment.factors).toHaveLength(8);
    expect(
      assessment.factors.reduce(
        (total, factor) => total + factor.weightedContribution,
        0,
      ),
    ).toBeCloseTo(assessment.score);
    expect(assessment.advisoryOnly).toBe(true);
    expect(assessment.humanAuthorizationRequired).toBe(true);
  });

  it("lets an intermittent-connectivity gap force a localized micro-pilot", () => {
    const assessment = assessTransferability(
      scenarios.intermittentConnectivityGap!,
    );

    expect(assessment.score).toBe(0.816);
    expect(assessment.scoreBandRecommendation).toBe(
      "REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT",
    );
    expect(assessment.recommendation).toBe("RUN_LOCALIZED_MICRO_PILOT");
    expect(assessment.bindingConstraints).toContain(
      "LOCALIZED_MICRO_PILOT_REQUIRED",
    );
    expect(assessment.gaps).toContain(
      "operatingContextFit: Intermittent-connectivity support is not evidenced.",
    );
  });

  it("rejects incomplete or duplicate factor sets", () => {
    const strongFit = scenarios.strongFit!;
    expect(() =>
      assessTransferability({
        ...strongFit,
        factors: strongFit.factors.slice(0, 7),
      }),
    ).toThrow(/requires each factor exactly once/);
  });
});
