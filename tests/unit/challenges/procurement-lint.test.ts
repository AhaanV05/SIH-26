import { describe, expect, it } from "vitest";

import {
  hasBlockingProcurementFindings,
  lintChallengeSpec,
  procurementLintRules,
  type ChallengeSpecDraft,
} from "../../../src/modules/challenges";
import { cloneChallengeSpec, createChallengeSpecDraft } from "./fixture";

describe("deterministic procurement lint pack", () => {
  it("exposes at least eight stable rules and complete finding contracts", () => {
    expect(procurementLintRules.length).toBeGreaterThanOrEqual(8);
    expect(new Set(procurementLintRules.map((rule) => rule.code)).size).toBe(
      procurementLintRules.length,
    );

    const findings = lintChallengeSpec({});
    expect(findings.length).toBeGreaterThan(0);
    findings.forEach((finding) => {
      expect(finding.ruleCode).toMatch(/^MS-PROC-\d{3}$/);
      expect(["BLOCKING", "WARNING", "INFO"]).toContain(finding.severity);
      expect(finding.path.length).toBeGreaterThan(0);
      expect(finding.message.length).toBeGreaterThan(0);
      expect(finding.explanation.length).toBeGreaterThan(0);
      expect(finding.remediation.length).toBeGreaterThan(0);
    });
  });

  it("returns no findings for a complete, outcome-based fixture", () => {
    expect(lintChallengeSpec(createChallengeSpecDraft())).toEqual([]);
  });

  it("finds measurable, inclusion, governance, and contract problems in a poor draft", () => {
    const poorDraft: ChallengeSpecDraft = {
      problem: {
        title: "Oracle-only system",
        statement: "The supplier must use Oracle and Hyperledger for this government solution.",
        baseline: [],
      },
      outcomes: [{ id: "OUT-1", statement: "Improve service", metricIds: [] }],
      metrics: [
        {
          id: "MET-1",
          name: "improvement",
          direction: "GTE",
        },
      ],
      eligibility: [
        {
          id: "EL-1",
          kind: "TURNOVER",
          mandatory: true,
          acceptedEvidence: [],
        },
      ],
      rubric: [{ id: "R-1", name: "Approach", weight: 60 }],
      sandbox: {
        egress: "ALLOW_LIST",
        usesProductionCitizenData: true,
      },
      milestones: [{ id: "MS-1", name: "Pilot", paymentPercent: 120 }],
      requirements: {},
    };

    const findings = lintChallengeSpec(poorDraft);
    const codes = new Set(findings.map((item) => item.ruleCode));

    [
      "MS-PROC-001",
      "MS-PROC-002",
      "MS-PROC-003",
      "MS-PROC-004",
      "MS-PROC-005",
      "MS-PROC-006",
      "MS-PROC-007",
      "MS-PROC-008",
      "MS-PROC-009",
      "MS-PROC-010",
      "MS-PROC-011",
      "MS-PROC-012",
      "MS-PROC-013",
      "MS-PROC-014",
      "MS-PROC-015",
      "MS-PROC-016",
    ].forEach((code) => expect(codes.has(code)).toBe(true));
    expect(hasBlockingProcurementFindings(findings)).toBe(true);
  });

  it("flags startup barriers only when mandatory and unjustified", () => {
    const draft = cloneChallengeSpec(createChallengeSpecDraft());
    draft.eligibility.push({
      id: "EL-2",
      kind: "TURNOVER",
      mandatory: true,
      acceptedEvidence: ["OFFICER_VERIFIED"],
      verificationMethod: "Review the submitted audited financial evidence.",
    });

    expect(lintChallengeSpec(draft).map((item) => item.ruleCode)).toContain("MS-PROC-006");

    const turnoverCriterion = draft.eligibility[1];
    if (!turnoverCriterion) {
      throw new Error("The test must append a turnover eligibility criterion");
    }
    turnoverCriterion.justification =
      "Documented financial exposure requires this proportionate threshold, subject to review.";
    expect(lintChallengeSpec(draft).map((item) => item.ruleCode)).not.toContain(
      "MS-PROC-006",
    );
  });

  it("blocks production citizen data without an owner and legal basis", () => {
    const draft = cloneChallengeSpec(createChallengeSpecDraft());
    draft.sandbox.usesProductionCitizenData = true;
    draft.sandbox.dataClassification = "RESTRICTED";

    let findings = lintChallengeSpec(draft);
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleCode: "MS-PROC-009", severity: "BLOCKING" }),
    );

    draft.sandbox.dataOwner = "Authorized departmental data steward";
    draft.sandbox.legalBasis =
      "Reviewed purpose and legal authority recorded by the authorized department.";
    draft.sandbox.dataClassification = "PUBLIC";
    findings = lintChallengeSpec(draft);
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleCode: "MS-PROC-009", severity: "BLOCKING" }),
    );

    draft.sandbox.dataClassification = "RESTRICTED";
    findings = lintChallengeSpec(draft);
    expect(findings.map((item) => item.ruleCode)).not.toContain("MS-PROC-009");
  });

  it("finds a pilot window shorter than its dependency lead time", () => {
    const draft = cloneChallengeSpec(createChallengeSpecDraft());
    if (!draft.timeline) throw new Error("Fixture timeline is required");
    draft.timeline.pilotStartAt = "2026-09-10T09:00:00+05:30";
    draft.timeline.pilotEndAt = "2026-09-12T09:00:00+05:30";
    draft.timeline.dependencyLeadTimeDays = 7;

    expect(lintChallengeSpec(draft)).toContainEqual(
      expect.objectContaining({
        ruleCode: "MS-PROC-008",
        severity: "BLOCKING",
        path: "timeline.pilotEndAt",
      }),
    );
  });

  it("is deterministic and does not mutate its input", () => {
    const draft = cloneChallengeSpec(createChallengeSpecDraft());
    draft.requirements = {};
    const before = JSON.stringify(draft);

    const first = lintChallengeSpec(draft);
    const second = lintChallengeSpec(draft);

    expect(second).toEqual(first);
    expect(JSON.stringify(draft)).toBe(before);
  });
});
