import {
  declareEvaluationConflict,
  submitIndependentEvaluation,
} from "./evaluation-engine";
import type {
  CriterionScoreInput,
  EvaluationAssignment,
  EvaluationSubmission,
  FrozenRubric,
} from "./types";

export const DEMO_FROZEN_RUBRIC: FrozenRubric = {
  versionId: "SPEC-CHAL-WASTE-PUNE-001-V1",
  version: 1,
  contentHash: "87c92d4a04d2303f4e4b499fba842c6aa5b08d8084d6ee4c7f6f953f477c7050",
  frozenAt: "2026-07-01T04:30:00.000Z",
  criteria: [
    { id: "R-1", name: "Outcome approach", weight: 30, scoreMin: 0, scoreMax: 10 },
    { id: "R-2", name: "Pilot feasibility", weight: 25, scoreMin: 0, scoreMax: 10 },
    { id: "R-3", name: "Security and privacy", weight: 20, scoreMin: 0, scoreMax: 10 },
    { id: "R-4", name: "Interoperability and exit", weight: 15, scoreMin: 0, scoreMax: 10 },
    { id: "R-5", name: "Pilot cost", weight: 10, scoreMin: 0, scoreMax: 10 },
  ],
};

export const DEMO_PENDING_ASSIGNMENT: EvaluationAssignment = {
  id: "ASSIGN-PROP-ECOSCAN-USR-EVAL-3",
  proposalId: "PROP-ECOSCAN",
  evaluatorId: "USR-EVAL-3",
  rubricVersionId: DEMO_FROZEN_RUBRIC.versionId,
  rubricContentHash: DEMO_FROZEN_RUBRIC.contentHash,
  status: "ASSIGNED",
  conflictDeclaration: null,
};

export const DEMO_DEFAULT_SCORES: readonly CriterionScoreInput[] = [
  { rubricCriterionId: "R-1", value: 9, rationale: "The approach maps directly to both measurable waste-response outcomes." },
  { rubricCriterionId: "R-2", value: 7, rationale: "The phased sandbox and ward plan is feasible within the proposed window." },
  { rubricCriterionId: "R-3", value: 8, rationale: "Synthetic data and edge processing reduce privacy and security exposure." },
  { rubricCriterionId: "R-4", value: 8, rationale: "Versioned APIs and documented exports provide a credible exit path." },
  { rubricCriterionId: "R-5", value: 7, rationale: "The pilot cost is reasonable for the scope and evidence produced." },
];

function seededSubmission(
  assignmentId: string,
  evaluatorId: string,
  values: readonly number[],
): EvaluationSubmission {
  const declared = declareEvaluationConflict(
    { ...DEMO_PENDING_ASSIGNMENT, id: assignmentId, evaluatorId },
    { id: evaluatorId, role: "EVALUATOR" },
    { hasConflict: false, declaredAt: "2026-07-21T04:30:00.000Z" },
  );
  return submitIndependentEvaluation({
    assignment: declared,
    actor: { id: evaluatorId, role: "EVALUATOR" },
    rubric: DEMO_FROZEN_RUBRIC,
    scores: DEMO_DEFAULT_SCORES.map((score, index) => ({
      ...score,
      value: values[index] ?? score.value,
      rationale: `${score.rationale} Independent review by ${evaluatorId}.`,
    })),
    submittedAt: "2026-07-22T04:30:00.000Z",
  }).submission;
}

export const DEMO_EXISTING_SUBMISSIONS: readonly EvaluationSubmission[] = [
  seededSubmission("ASSIGN-PROP-ECOSCAN-USR-EVAL-1", "USR-EVAL-1", [9, 8, 9, 7, 7]),
  seededSubmission("ASSIGN-PROP-ECOSCAN-USR-EVAL-2", "USR-EVAL-2", [8, 8, 5, 7, 6]),
];

export const DEMO_EVALUATION_LABEL = "SIMULATED_FOR_DEMO · Synthetic evaluation fixture";
