import { describe, expect, it } from "vitest";

import {
  EvaluationRuleError,
  analyzeEvaluationIntegrity,
  declareEvaluationConflict,
  moderateProposal,
  submitIndependentEvaluation,
  validateFrozenRubric,
  type CriterionScoreInput,
  type EvaluationAssignment,
  type EvaluationSubmission,
  type FrozenRubric,
} from "@/modules/evaluations";

const HASH = "a".repeat(64);
const rubric: FrozenRubric = {
  versionId: "SPEC-WASTE-V1",
  version: 1,
  contentHash: HASH,
  frozenAt: "2026-07-01T04:30:00.000Z",
  criteria: [
    { id: "R-1", name: "Outcome approach", weight: 40, scoreMin: 0, scoreMax: 10 },
    { id: "R-2", name: "Security and privacy", weight: 35, scoreMin: 0, scoreMax: 10 },
    { id: "R-3", name: "Pilot cost", weight: 25, scoreMin: 0, scoreMax: 10 },
  ],
};

function assignment(id = "ASSIGN-1", evaluatorId = "USR-EVAL-1"): EvaluationAssignment {
  return {
    id,
    proposalId: "PROP-ECOSCAN",
    evaluatorId,
    rubricVersionId: rubric.versionId,
    rubricContentHash: rubric.contentHash,
    status: "ASSIGNED",
    conflictDeclaration: null,
  };
}

const scores: CriterionScoreInput[] = [
  { rubricCriterionId: "R-1", value: 8, rationale: "Strong measurable outcome approach." },
  { rubricCriterionId: "R-2", value: 6, rationale: "Security controls are credible but need review." },
  { rubricCriterionId: "R-3", value: 7, rationale: "Pilot cost is proportionate to the scope." },
];

function clearAssignment(id = "ASSIGN-1", evaluatorId = "USR-EVAL-1"): EvaluationAssignment {
  return declareEvaluationConflict(assignment(id, evaluatorId), { id: evaluatorId, role: "EVALUATOR" }, {
    hasConflict: false,
    declaredAt: "2026-07-21T04:30:00.000Z",
  });
}

function submission(
  id = "ASSIGN-1",
  evaluatorId = "USR-EVAL-1",
  overrides: Partial<Record<"R-1" | "R-2" | "R-3", number>> = {},
  rationaleSuffix = evaluatorId,
): EvaluationSubmission {
  const assignmentRecord = clearAssignment(id, evaluatorId);
  return submitIndependentEvaluation({
    assignment: assignmentRecord,
    actor: { id: evaluatorId, role: "EVALUATOR" },
    rubric,
    submittedAt: "2026-07-22T04:30:00.000Z",
    scores: scores.map((score) => ({
      ...score,
      value: overrides[score.rubricCriterionId as keyof typeof overrides] ?? score.value,
      rationale: `${score.rationale} ${rationaleSuffix}`,
    })),
  }).submission;
}

function expectRuleError(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error("Expected EvaluationRuleError");
  } catch (error) {
    expect(error).toBeInstanceOf(EvaluationRuleError);
    expect((error as EvaluationRuleError).code).toBe(code);
  }
}

describe("evaluation conflict gate", () => {
  it("opens scoring only after the assigned evaluator declares no conflict", () => {
    const result = clearAssignment();
    expect(result.status).toBe("READY_TO_SCORE");
    expect(result.conflictDeclaration).toMatchObject({ hasConflict: false, declaredBy: "USR-EVAL-1" });
  });

  it("recuses a conflicted evaluator and requires meaningful details", () => {
    const result = declareEvaluationConflict(
      assignment(),
      { id: "USR-EVAL-1", role: "EVALUATOR" },
      {
        hasConflict: true,
        details: "Prior paid consulting relationship within the last year.",
        declaredAt: "2026-07-21T04:30:00.000Z",
      },
    );
    expect(result.status).toBe("RECUSED");
    expect(result.conflictDeclaration?.hasConflict).toBe(true);

    expectRuleError(
      () =>
        declareEvaluationConflict(assignment(), { id: "USR-EVAL-1", role: "EVALUATOR" }, {
          hasConflict: true,
          details: "friend",
          declaredAt: "2026-07-21T04:30:00.000Z",
        }),
      "CONFLICT_DETAILS_REQUIRED",
    );
  });

  it("blocks another evaluator and non-evaluator roles from declaring", () => {
    expectRuleError(
      () => declareEvaluationConflict(assignment(), { id: "USR-EVAL-2", role: "EVALUATOR" }, { hasConflict: false, declaredAt: "2026-07-21T04:30:00.000Z" }),
      "ACTOR_NOT_ASSIGNED",
    );
    expectRuleError(
      () => declareEvaluationConflict(assignment(), { id: "USR-OWNER", role: "PROBLEM_OWNER" }, { hasConflict: false, declaredAt: "2026-07-21T04:30:00.000Z" }),
      "ACTOR_NOT_EVALUATOR",
    );
  });
});

describe("frozen rubric scoring", () => {
  it("validates a frozen, complete, 100-weight rubric", () => {
    expect(() => validateFrozenRubric(rubric)).not.toThrow();
  });

  it("rejects invalid rubric weights and unfrozen hashes", () => {
    expectRuleError(() => validateFrozenRubric({ ...rubric, criteria: rubric.criteria.map((item) => ({ ...item, weight: 10 })) }), "RUBRIC_INVALID");
    expectRuleError(() => validateFrozenRubric({ ...rubric, contentHash: "demo" }), "RUBRIC_NOT_FROZEN");
  });

  it("blocks scoring before a conflict declaration and after recusal", () => {
    expectRuleError(
      () => submitIndependentEvaluation({ assignment: assignment(), actor: { id: "USR-EVAL-1", role: "EVALUATOR" }, rubric, scores, submittedAt: "2026-07-22T04:30:00.000Z" }),
      "CONFLICT_DECLARATION_REQUIRED",
    );
    const recused = declareEvaluationConflict(assignment(), { id: "USR-EVAL-1", role: "EVALUATOR" }, {
      hasConflict: true,
      details: "Prior paid consulting relationship within the last year.",
      declaredAt: "2026-07-21T04:30:00.000Z",
    });
    expectRuleError(
      () => submitIndependentEvaluation({ assignment: recused, actor: { id: "USR-EVAL-1", role: "EVALUATOR" }, rubric, scores, submittedAt: "2026-07-22T04:30:00.000Z" }),
      "CONFLICT_REQUIRES_RECUSAL",
    );
  });

  it("binds submissions to the assignment's frozen rubric hash", () => {
    expectRuleError(
      () => submitIndependentEvaluation({ assignment: { ...clearAssignment(), rubricContentHash: "b".repeat(64) }, actor: { id: "USR-EVAL-1", role: "EVALUATOR" }, rubric, scores, submittedAt: "2026-07-22T04:30:00.000Z" }),
      "RUBRIC_HASH_MISMATCH",
    );
  });

  it("requires every criterion exactly once, valid ranges, and rationales", () => {
    const base = { assignment: clearAssignment(), actor: { id: "USR-EVAL-1", role: "EVALUATOR" } as const, rubric, submittedAt: "2026-07-22T04:30:00.000Z" };
    expectRuleError(() => submitIndependentEvaluation({ ...base, scores: scores.slice(0, 2) }), "SCORE_SET_INCOMPLETE");
    expectRuleError(() => submitIndependentEvaluation({ ...base, scores: scores.map((score) => score.rubricCriterionId === "R-2" ? { ...score, value: 11 } : score) }), "SCORE_OUT_OF_RANGE");
    expectRuleError(() => submitIndependentEvaluation({ ...base, scores: scores.map((score) => score.rubricCriterionId === "R-2" ? { ...score, rationale: "vague" } : score) }), "RATIONALE_REQUIRED");
  });

  it("calculates a transparent 0-100 weighted score and closes immutable independent scoring", () => {
    const result = submitIndependentEvaluation({ assignment: clearAssignment(), actor: { id: "USR-EVAL-1", role: "EVALUATOR" }, rubric, scores, submittedAt: "2026-07-22T04:30:00.000Z" });
    expect(result.assignment.status).toBe("SUBMITTED");
    expect(result.submission.weightedScore).toBe(70.5);
    expect(result.submission.independent).toBe(true);
    expect(result.submission.scores.map((score) => score.weightedContribution)).toEqual([32, 21, 17.5]);
    expectRuleError(() => submitIndependentEvaluation({ assignment: result.assignment, actor: { id: "USR-EVAL-1", role: "EVALUATOR" }, rubric, scores, submittedAt: "2026-07-22T05:30:00.000Z", existingSubmission: result.submission }), "EVALUATION_ALREADY_SUBMITTED");
  });
});

describe("integrity advisories and human moderation", () => {
  it("emits advisory-only divergence flags without accusing evaluators", () => {
    const submissions = [
      submission("ASSIGN-1", "USR-EVAL-1", { "R-2": 9 }),
      submission("ASSIGN-2", "USR-EVAL-2", { "R-2": 5 }),
      submission("ASSIGN-3", "USR-EVAL-3", { "R-2": 8 }),
    ];
    const advisories = analyzeEvaluationIntegrity(rubric, submissions);
    expect(advisories).toEqual(expect.arrayContaining([expect.objectContaining({ code: "CRITERION_SCORE_DIVERGENCE", rubricCriterionId: "R-2", advisoryOnly: true, accusation: false })]));
  });

  it("flags identical rationale text as a review signal, not proof", () => {
    const first = submission("ASSIGN-1", "USR-EVAL-1", {}, "same exact independent wording");
    const second = { ...submission("ASSIGN-2", "USR-EVAL-2", {}, "different"), scores: first.scores };
    const advisories = analyzeEvaluationIntegrity(rubric, [first, second]);
    expect(advisories.some((advisory) => advisory.code === "DUPLICATE_RATIONALE" && advisory.accusation === false)).toBe(true);
  });

  it("does not invent alerts when fewer than two submissions exist", () => {
    expect(analyzeEvaluationIntegrity(rubric, [submission()])).toEqual([]);
  });

  it("requires an authorized human, complete independent scoring, and reasons", () => {
    const submissions = [submission("ASSIGN-1", "USR-EVAL-1"), submission("ASSIGN-2", "USR-EVAL-2")];
    const common = {
      proposalId: "PROP-ECOSCAN",
      decision: "SELECTED" as const,
      rationale: "The proposal best addresses the frozen outcomes after evidence-backed moderation.",
      decidedAt: "2026-07-24T09:30:00.000Z",
      rubric,
      eligibleAssignmentIds: ["ASSIGN-1", "ASSIGN-2"],
      submissions,
      advisories: [],
      advisoryReviews: [],
    };
    expectRuleError(() => moderateProposal({ ...common, actor: { id: "USR-EVAL-1", role: "EVALUATOR" } }), "ACTOR_NOT_AUTHORIZED_TO_MODERATE");
    expectRuleError(() => moderateProposal({ ...common, actor: { id: "USR-OWNER", role: "PROBLEM_OWNER" }, submissions: submissions.slice(0, 1) }), "INDEPENDENT_SCORING_INCOMPLETE");
    expectRuleError(() => moderateProposal({ ...common, actor: { id: "USR-OWNER", role: "PROBLEM_OWNER" }, rationale: "best score" }), "MODERATION_REASON_REQUIRED");
  });

  it("requires every integrity advisory to be resolved with a reason", () => {
    const submissions = [submission("ASSIGN-1", "USR-EVAL-1", { "R-2": 9 }), submission("ASSIGN-2", "USR-EVAL-2", { "R-2": 5 })];
    const advisories = analyzeEvaluationIntegrity(rubric, submissions);
    expectRuleError(
      () => moderateProposal({ actor: { id: "USR-OWNER", role: "PROBLEM_OWNER" }, proposalId: "PROP-ECOSCAN", decision: "SELECTED", rationale: "Selected after reviewing the proposal against every frozen outcome and criterion.", decidedAt: "2026-07-24T09:30:00.000Z", rubric, eligibleAssignmentIds: ["ASSIGN-1", "ASSIGN-2"], submissions, advisories, advisoryReviews: [] }),
      "ADVISORY_REVIEW_REQUIRED",
    );
  });

  it("recomputes submitted totals and rejects score tampering before moderation", () => {
    const first = submission("ASSIGN-1", "USR-EVAL-1");
    const second = submission("ASSIGN-2", "USR-EVAL-2");
    expectRuleError(
      () => moderateProposal({
        actor: { id: "USR-OWNER", role: "PROBLEM_OWNER" },
        proposalId: "PROP-ECOSCAN",
        decision: "SELECTED",
        rationale: "Selected after an authorized review of all frozen rubric evidence and delivery constraints.",
        decidedAt: "2026-07-24T09:30:00.000Z",
        rubric,
        eligibleAssignmentIds: ["ASSIGN-1", "ASSIGN-2"],
        submissions: [{ ...first, weightedScore: 99 }, second],
        advisories: [],
        advisoryReviews: [],
      }),
      "SUBMISSION_INTEGRITY_INVALID",
    );
  });

  it("records the human's decision without autonomously selecting a winner", () => {
    const submissions = [submission("ASSIGN-1", "USR-EVAL-1"), submission("ASSIGN-2", "USR-EVAL-2")];
    const decision = moderateProposal({
      actor: { id: "USR-OWNER", role: "PROBLEM_OWNER" },
      proposalId: "PROP-ECOSCAN",
      decision: "NOT_SELECTED",
      rationale: "Authorized moderation chose not to select this proposal after reviewing delivery constraints.",
      decidedAt: "2026-07-24T09:30:00.000Z",
      rubric,
      eligibleAssignmentIds: ["ASSIGN-1", "ASSIGN-2"],
      submissions,
      advisories: [],
      advisoryReviews: [],
    });
    expect(decision).toMatchObject({ decision: "NOT_SELECTED", finalScore: 70.5, humanAuthorized: true, autonomousSelection: false, decidedByRole: "PROBLEM_OWNER" });
  });
});
