import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  canonicalizeJson,
  challengeSpecSchema,
  computeChallengeSpecContentHash,
  freezeChallengeSpec,
  parseChallengeSpec,
  validateChallengeSpec,
  verifyChallengeSpecContentHash,
  type ChallengeSpec,
} from "../../../src/modules/challenges";
import { cloneChallengeSpec, createChallengeSpecDraft } from "./fixture";

const satisfiedApprovals = ["PROBLEM_OWNER", "PROCUREMENT_REVIEWER"] as const;

function createReviewReadySpec(): ChallengeSpec {
  const specification = createChallengeSpecDraft();
  specification.status = "UNDER_REVIEW";
  return specification;
}

function freezeValidChallenge(): ChallengeSpec {
  return freezeChallengeSpec(createReviewReadySpec(), {
    frozenAt: "2026-09-01T08:30:00+05:30",
    satisfiedApproverRoles: satisfiedApprovals,
    operatingMode: "DEMO",
  });
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, entry]) => [key, reverseObjectKeys(entry)]),
    );
  }
  return value;
}

describe("ChallengeSpec v1", () => {
  it("parses a valid executable draft", () => {
    const result = challengeSpecSchema.safeParse(createChallengeSpecDraft());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe("mahasetu.challenge/1.0");
      expect(result.data.rubric.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    }
  });

  it("rejects duplicate identifiers, dangling references, invalid weights, and over-allocation", () => {
    const invalid = cloneChallengeSpec(createChallengeSpecDraft());
    const firstMetric = invalid.metrics[0];
    const firstOutcome = invalid.outcomes[0];
    const firstMilestone = invalid.milestones[0];
    const firstRubricCriterion = invalid.rubric[0];
    if (!firstMetric || !firstOutcome || !firstMilestone || !firstRubricCriterion) {
      throw new Error("The valid fixture must include metric, outcome, milestone, and rubric records");
    }

    invalid.metrics.push({ ...firstMetric });
    firstOutcome.metricIds = ["MET-MISSING"];
    firstMilestone.requiredMetricIds = ["MET-UNKNOWN"];
    firstRubricCriterion.weight = 31;
    invalid.milestones.push({
      ...firstMilestone,
      id: "MS-2",
      paymentPercent: 1,
    });

    const result = challengeSpecSchema.safeParse(invalid);

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join("\n");
      expect(messages).toContain("Duplicate stable identifier: MET-1");
      expect(messages).toContain("Outcome references unknown metric MET-MISSING");
      expect(messages).toContain("Milestone references unknown metric MET-UNKNOWN");
      expect(messages).toContain("Rubric weights must total 100");
      expect(messages).toContain("Milestone payment percentages cannot exceed 100");
    }
  });

  it("freezes a mutable spec with a valid canonical content hash", () => {
    const frozen = freezeValidChallenge();

    expect(frozen.status).toBe("APPROVED");
    expect(frozen.integrity.frozenAt).toBe("2026-09-01T08:30:00+05:30");
    expect(frozen.integrity.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyChallengeSpecContentHash(frozen)).toBe(true);
    expect(validateChallengeSpec(frozen).success).toBe(true);
  });

  it("produces the same hash for equivalent object key orderings", () => {
    const frozen = freezeValidChallenge();
    const reordered = reverseObjectKeys(frozen) as ChallengeSpec;

    expect(computeChallengeSpecContentHash(reordered)).toBe(
      computeChallengeSpecContentHash(frozen),
    );
  });

  it("detects a material mutation after freeze", () => {
    const frozen = freezeValidChallenge();
    const tampered = cloneChallengeSpec(frozen);
    tampered.problem.title = "Tampered community-bin challenge";

    expect(verifyChallengeSpecContentHash(tampered)).toBe(false);
    const result = validateChallengeSpec(tampered);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "integrity.contentHash",
          code: "integrity_mismatch",
        }),
      );
    }
  });

  it("preserves the immutable content hash across frozen lifecycle statuses", () => {
    const approved = freezeValidChallenge();

    for (const status of ["PUBLISHED", "SUPERSEDED"] as const) {
      const transitioned = { ...approved, status };
      expect(computeChallengeSpecContentHash(transitioned)).toBe(
        approved.integrity.contentHash,
      );
      expect(verifyChallengeSpecContentHash(transitioned)).toBe(true);
      expect(validateChallengeSpec(transitioned).success).toBe(true);
    }
  });

  it("requires review state, resolved blockers, and every required approval", () => {
    expect(() =>
      freezeChallengeSpec(createChallengeSpecDraft(), {
        frozenAt: "2026-09-01T08:30:00+05:30",
        satisfiedApproverRoles: satisfiedApprovals,
        operatingMode: "DEMO",
      }),
    ).toThrow("Only UNDER_REVIEW");

    const blocked = createReviewReadySpec();
    if (!blocked.requirements) throw new Error("Fixture requirements are required");
    delete blocked.requirements.securityAndPrivacy;
    expect(() =>
      freezeChallengeSpec(blocked, {
        frozenAt: "2026-09-01T08:30:00+05:30",
        satisfiedApproverRoles: satisfiedApprovals,
        operatingMode: "DEMO",
      }),
    ).toThrow("MS-PROC-014");

    expect(() =>
      freezeChallengeSpec(createReviewReadySpec(), {
        frozenAt: "2026-09-01T08:30:00+05:30",
        satisfiedApproverRoles: ["PROBLEM_OWNER"],
        operatingMode: "DEMO",
      }),
    ).toThrow("PROCUREMENT_REVIEWER");
  });

  it("protects production citizen data and prohibits it in demo mode", () => {
    const specification = createReviewReadySpec();
    specification.sandbox.usesProductionCitizenData = true;
    specification.sandbox.dataClassification = "PUBLIC";
    specification.sandbox.dataOwner = "Authorized departmental data steward";
    specification.sandbox.legalBasis =
      "Reviewed lawful purpose for controlled production processing.";

    expect(challengeSpecSchema.safeParse(specification).success).toBe(false);

    specification.sandbox.dataClassification = "RESTRICTED";
    expect(challengeSpecSchema.safeParse(specification).success).toBe(true);
    expect(() =>
      freezeChallengeSpec(specification, {
        frozenAt: "2026-09-01T08:30:00+05:30",
        satisfiedApproverRoles: satisfiedApprovals,
        operatingMode: "DEMO",
      }),
    ).toThrow("must not use production citizen data");

    expect(
      freezeChallengeSpec(specification, {
        frozenAt: "2026-09-01T08:30:00+05:30",
        satisfiedApproverRoles: satisfiedApprovals,
        operatingMode: "PRODUCTION",
      }).status,
    ).toBe("APPROVED");
  });

  it("requires a strict freeze timestamp no later than applications opening", () => {
    expect(() =>
      freezeChallengeSpec(createReviewReadySpec(), {
        frozenAt: "2026-09-01T08:30:00+14:01",
        satisfiedApproverRoles: satisfiedApprovals,
        operatingMode: "DEMO",
      }),
    ).toThrow("valid timezone-aware ISO timestamp");

    expect(() =>
      freezeChallengeSpec(createReviewReadySpec(), {
        frozenAt: "2026-09-01T09:00:01+05:30",
        satisfiedApproverRoles: satisfiedApprovals,
        operatingMode: "DEMO",
      }),
    ).toThrow("no later than applicationsOpenAt");
  });

  it("preserves native Zod issue codes and numeric paths", () => {
    const invalid = createChallengeSpecDraft();
    const firstMetric = invalid.metrics[0];
    if (!firstMetric) throw new Error("Fixture metric is required");
    firstMetric.target = "not-a-number" as unknown as number;

    try {
      parseChallengeSpec(invalid);
      throw new Error("Expected parseChallengeSpec to reject invalid input");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      if (!(error instanceof z.ZodError)) throw error;
      expect(error.issues).toContainEqual(
        expect.objectContaining({
          code: "invalid_type",
          path: ["metrics", 0, "target"],
        }),
      );
    }
  });
});

describe("canonical JSON", () => {
  it("sorts object keys recursively while retaining array order", () => {
    expect(canonicalizeJson({ z: 1, a: { y: 2, x: [3, 1] } })).toBe(
      '{"a":{"x":[3,1],"y":2},"z":1}',
    );
  });

  it("rejects ambiguous values and circular references", () => {
    expect(() => canonicalizeJson({ missing: undefined })).toThrow(/Unsupported undefined/);
    expect(() => canonicalizeJson({ invalid: Number.NaN })).toThrow(/Non-finite/);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalizeJson(circular)).toThrow(/Circular reference/);
  });
});
