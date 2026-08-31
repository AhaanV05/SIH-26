import { describe, expect, it } from "vitest";

import {
  canonicalizeJson,
  challengeSpecSchema,
  computeChallengeSpecContentHash,
  freezeChallengeSpec,
  validateChallengeSpec,
  verifyChallengeSpecContentHash,
  type ChallengeSpec,
} from "../../../src/modules/challenges";
import { cloneChallengeSpec, createChallengeSpecDraft } from "./fixture";

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
    invalid.metrics.push({ ...invalid.metrics[0] });
    invalid.outcomes[0].metricIds = ["MET-MISSING"];
    invalid.milestones[0].requiredMetricIds = ["MET-UNKNOWN"];
    invalid.rubric[0].weight = 31;
    invalid.milestones.push({
      ...invalid.milestones[0],
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
    const frozen = freezeChallengeSpec(
      createChallengeSpecDraft(),
      "2026-09-01T10:00:00+05:30",
    );

    expect(frozen.status).toBe("APPROVED");
    expect(frozen.integrity.frozenAt).toBe("2026-09-01T10:00:00+05:30");
    expect(frozen.integrity.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyChallengeSpecContentHash(frozen)).toBe(true);
    expect(validateChallengeSpec(frozen).success).toBe(true);
  });

  it("produces the same hash for equivalent object key orderings", () => {
    const frozen = freezeChallengeSpec(
      createChallengeSpecDraft(),
      "2026-09-01T10:00:00+05:30",
    );
    const reordered = reverseObjectKeys(frozen) as ChallengeSpec;

    expect(computeChallengeSpecContentHash(reordered)).toBe(
      computeChallengeSpecContentHash(frozen),
    );
  });

  it("detects a material mutation after freeze", () => {
    const frozen = freezeChallengeSpec(
      createChallengeSpecDraft(),
      "2026-09-01T10:00:00+05:30",
    );
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

