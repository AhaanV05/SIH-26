import { describe, expect, it } from "vitest";

import { compileChallengeDraft } from "@/modules/compiler";

const poorBrief = {
  problemStatement:
    "Bins overflow for hours before ward teams know, and the solution must use AI and Microsoft Azure for every alert.",
  department: "Urban Development Department",
  geography: "Pune, Maharashtra",
};

describe("deterministic offline Challenge Forge compiler", () => {
  it("turns an unstructured problem into a valid under-review specification", () => {
    const result = compileChallengeDraft(poorBrief);

    expect(result.mode).toBe("OFFLINE_FIXTURE");
    expect(result.label).toContain("SIMULATED_FOR_DEMO");
    expect(result.specification.status).toBe("UNDER_REVIEW");
    expect(result.specification.problem.geography).toEqual(["Pune, Maharashtra"]);
    expect(result.specification.metrics).toHaveLength(1);
    expect(result.specification.rubric.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    expect(result.findings.map((finding) => finding.ruleCode)).toContain("MS-PROC-005");
    expect(result.findings.every((finding) => finding.severity !== "BLOCKING")).toBe(true);
  });

  it("applies the accepted vendor-lock-in remediation and clears the finding", () => {
    const result = compileChallengeDraft({
      ...poorBrief,
      acceptedRemediationCodes: ["MS-PROC-005"],
    });

    expect(result.findings).toEqual([]);
    expect(result.specification.problem.statement).not.toMatch(/must use|microsoft azure/i);
    expect(result.specification.problem.statement).toContain("interoperable technology");
  });

  it("is reproducible for identical input", () => {
    expect(compileChallengeDraft(poorBrief)).toEqual(compileChallengeDraft(poorBrief));
  });

  it("rejects incomplete intake instead of inventing context", () => {
    expect(() =>
      compileChallengeDraft({
        problemStatement: "Too short",
        department: "",
        geography: "",
      }),
    ).toThrow("Problem statement must contain at least 20 characters");
  });
});
