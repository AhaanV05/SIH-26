import {
  EvaluationRuleError,
  type AdvisoryReview,
  type CriterionScoreInput,
  type EvaluationActor,
  type EvaluationAssignment,
  type EvaluationIntegrityAdvisory,
  type EvaluationSubmission,
  type FrozenRubric,
  type ModerationDecision,
  type ModerationDecisionType,
} from "./types";

const EPSILON = 1e-9;

function round(value: number, places = 2): number {
  const multiplier = 10 ** places;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function requireTimestamp(value: string): void {
  const timezoneAwareIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!timezoneAwareIso.test(value) || Number.isNaN(Date.parse(value))) {
    throw new EvaluationRuleError("INVALID_TIMESTAMP", "A valid ISO timestamp is required.");
  }
}

function recomputeSubmissionScore(
  rubric: FrozenRubric,
  submission: EvaluationSubmission,
): number {
  const scores = new Map(submission.scores.map((score) => [score.rubricCriterionId, score]));
  if (scores.size !== rubric.criteria.length || scores.size !== submission.scores.length) {
    throw new EvaluationRuleError(
      "SUBMISSION_INTEGRITY_INVALID",
      `Submission ${submission.id} does not contain every rubric criterion exactly once.`,
    );
  }
  let total = 0;
  for (const criterion of rubric.criteria) {
    const score = scores.get(criterion.id);
    if (
      !score ||
      !Number.isFinite(score.value) ||
      score.value < criterion.scoreMin ||
      score.value > criterion.scoreMax ||
      score.rationale.trim().length < 12
    ) {
      throw new EvaluationRuleError(
        "SUBMISSION_INTEGRITY_INVALID",
        `Submission ${submission.id} contains an invalid score or rationale for ${criterion.id}.`,
      );
    }
    total +=
      ((score.value - criterion.scoreMin) / (criterion.scoreMax - criterion.scoreMin)) *
      criterion.weight;
  }
  const recalculated = round(total);
  if (Math.abs(recalculated - submission.weightedScore) > EPSILON) {
    throw new EvaluationRuleError(
      "SUBMISSION_INTEGRITY_INVALID",
      `Submission ${submission.id} weighted score does not match its frozen-rubric scores.`,
    );
  }
  return recalculated;
}

function requireText(
  value: string | null | undefined,
  minimumLength: number,
  code: "CONFLICT_DETAILS_REQUIRED" | "RATIONALE_REQUIRED" | "MODERATION_REASON_REQUIRED",
  message: string,
): string {
  const normalized = value?.trim() ?? "";
  if (normalized.length < minimumLength) {
    throw new EvaluationRuleError(code, message);
  }
  return normalized;
}

export function validateFrozenRubric(rubric: FrozenRubric): void {
  requireTimestamp(rubric.frozenAt);
  if (!rubric.versionId.trim() || rubric.version < 1 || !/^[a-f0-9]{64}$/i.test(rubric.contentHash)) {
    throw new EvaluationRuleError(
      "RUBRIC_NOT_FROZEN",
      "Scoring requires a versioned, frozen rubric with a SHA-256 content hash.",
    );
  }
  if (rubric.criteria.length === 0) {
    throw new EvaluationRuleError("RUBRIC_INVALID", "The frozen rubric has no criteria.");
  }

  const ids = new Set<string>();
  let totalWeight = 0;
  for (const criterion of rubric.criteria) {
    if (
      !criterion.id.trim() ||
      !criterion.name.trim() ||
      ids.has(criterion.id) ||
      !Number.isFinite(criterion.weight) ||
      criterion.weight <= 0 ||
      !Number.isFinite(criterion.scoreMin) ||
      !Number.isFinite(criterion.scoreMax) ||
      criterion.scoreMax <= criterion.scoreMin
    ) {
      throw new EvaluationRuleError(
        "RUBRIC_INVALID",
        `Frozen rubric criterion ${criterion.id || "<missing>"} is invalid or duplicated.`,
      );
    }
    ids.add(criterion.id);
    totalWeight += criterion.weight;
  }

  if (Math.abs(totalWeight - 100) > EPSILON) {
    throw new EvaluationRuleError(
      "RUBRIC_INVALID",
      `Frozen rubric weights must total 100; received ${round(totalWeight, 4)}.`,
    );
  }
}

export function declareEvaluationConflict(
  assignment: EvaluationAssignment,
  actor: EvaluationActor,
  input: { readonly hasConflict: boolean; readonly details?: string | null; readonly declaredAt: string },
): EvaluationAssignment {
  if (actor.role !== "EVALUATOR") {
    throw new EvaluationRuleError("ACTOR_NOT_EVALUATOR", "Only an evaluator can declare an evaluation conflict.");
  }
  if (actor.id !== assignment.evaluatorId) {
    throw new EvaluationRuleError("ACTOR_NOT_ASSIGNED", "An evaluator may act only on their own assignment.");
  }
  if (assignment.status !== "ASSIGNED" || assignment.conflictDeclaration) {
    throw new EvaluationRuleError("ASSIGNMENT_NOT_OPEN", "This assignment already has a conflict declaration or is closed.");
  }
  requireTimestamp(input.declaredAt);

  const details = input.hasConflict
    ? requireText(
        input.details,
        15,
        "CONFLICT_DETAILS_REQUIRED",
        "A conflict declaration requires enough detail for an authorized reviewer to understand the relationship.",
      )
    : input.details?.trim() || null;

  return {
    ...assignment,
    status: input.hasConflict ? "RECUSED" : "READY_TO_SCORE",
    conflictDeclaration: {
      hasConflict: input.hasConflict,
      details,
      declaredAt: input.declaredAt,
      declaredBy: actor.id,
    },
  };
}

export function submitIndependentEvaluation(input: {
  readonly assignment: EvaluationAssignment;
  readonly actor: EvaluationActor;
  readonly rubric: FrozenRubric;
  readonly scores: readonly CriterionScoreInput[];
  readonly submittedAt: string;
  readonly existingSubmission?: EvaluationSubmission | null;
}): { readonly assignment: EvaluationAssignment; readonly submission: EvaluationSubmission } {
  const { assignment, actor, rubric, scores } = input;
  validateFrozenRubric(rubric);
  requireTimestamp(input.submittedAt);

  if (actor.role !== "EVALUATOR") {
    throw new EvaluationRuleError("ACTOR_NOT_EVALUATOR", "Only the assigned evaluator can submit rubric scores.");
  }
  if (actor.id !== assignment.evaluatorId) {
    throw new EvaluationRuleError("ACTOR_NOT_ASSIGNED", "An evaluator may submit only their own assignment.");
  }
  if (input.existingSubmission || assignment.status === "SUBMITTED") {
    throw new EvaluationRuleError("EVALUATION_ALREADY_SUBMITTED", "Independent scoring has already been submitted and is immutable.");
  }
  if (!assignment.conflictDeclaration) {
    throw new EvaluationRuleError("CONFLICT_DECLARATION_REQUIRED", "Declare a conflict or no conflict before scoring.");
  }
  if (assignment.conflictDeclaration.hasConflict || assignment.status === "RECUSED") {
    throw new EvaluationRuleError("CONFLICT_REQUIRES_RECUSAL", "A conflicted evaluator is recused and cannot score this proposal.");
  }
  if (assignment.status !== "READY_TO_SCORE") {
    throw new EvaluationRuleError("ASSIGNMENT_NOT_OPEN", "This assignment is not open for scoring.");
  }
  if (
    assignment.rubricVersionId !== rubric.versionId ||
    assignment.rubricContentHash !== rubric.contentHash
  ) {
    throw new EvaluationRuleError("RUBRIC_HASH_MISMATCH", "The assignment is not bound to this frozen rubric version and hash.");
  }

  const scoreByCriterion = new Map<string, CriterionScoreInput>();
  for (const score of scores) {
    if (scoreByCriterion.has(score.rubricCriterionId)) {
      throw new EvaluationRuleError("SCORE_SET_INCOMPLETE", `Criterion ${score.rubricCriterionId} was submitted more than once.`);
    }
    scoreByCriterion.set(score.rubricCriterionId, score);
  }
  if (scoreByCriterion.size !== rubric.criteria.length) {
    throw new EvaluationRuleError("SCORE_SET_INCOMPLETE", "Every frozen rubric criterion must be scored exactly once.");
  }

  let weightedScore = 0;
  const submittedScores = rubric.criteria.map((criterion) => {
    const score = scoreByCriterion.get(criterion.id);
    if (!score) {
      throw new EvaluationRuleError("SCORE_SET_INCOMPLETE", `Missing score for frozen criterion ${criterion.id}.`);
    }
    if (!Number.isFinite(score.value) || score.value < criterion.scoreMin || score.value > criterion.scoreMax) {
      throw new EvaluationRuleError(
        "SCORE_OUT_OF_RANGE",
        `${criterion.name} must be scored between ${criterion.scoreMin} and ${criterion.scoreMax}.`,
      );
    }
    const rationale = requireText(
      score.rationale,
      12,
      "RATIONALE_REQUIRED",
      `A meaningful rationale is required for ${criterion.name}.`,
    );
    const normalizedScore = (score.value - criterion.scoreMin) / (criterion.scoreMax - criterion.scoreMin);
    const weightedContribution = normalizedScore * criterion.weight;
    weightedScore += weightedContribution;
    return {
      rubricCriterionId: criterion.id,
      criterionName: criterion.name,
      value: score.value,
      rationale,
      normalizedScore: round(normalizedScore, 4),
      weightedContribution: round(weightedContribution, 4),
    };
  });

  const submission: EvaluationSubmission = {
    id: `EVAL-${assignment.id}`,
    assignmentId: assignment.id,
    proposalId: assignment.proposalId,
    evaluatorId: assignment.evaluatorId,
    rubricVersionId: rubric.versionId,
    rubricContentHash: rubric.contentHash,
    scores: submittedScores,
    weightedScore: round(weightedScore),
    submittedAt: input.submittedAt,
    independent: true,
  };

  return { assignment: { ...assignment, status: "SUBMITTED" }, submission };
}

function normalizedRationale(value: string): string {
  return value.toLocaleLowerCase("en-IN").replace(/\s+/g, " ").trim();
}

export function analyzeEvaluationIntegrity(
  rubric: FrozenRubric,
  submissions: readonly EvaluationSubmission[],
  options: { readonly criterionSpreadThreshold?: number; readonly overallSpreadThreshold?: number } = {},
): readonly EvaluationIntegrityAdvisory[] {
  validateFrozenRubric(rubric);
  const criterionThreshold = options.criterionSpreadThreshold ?? 3;
  const overallThreshold = options.overallSpreadThreshold ?? 20;
  const advisories: EvaluationIntegrityAdvisory[] = [];
  if (submissions.length < 2) return advisories;

  for (const criterion of rubric.criteria) {
    const entries = submissions.map((submission) => ({
      assignmentId: submission.assignmentId,
      score: submission.scores.find((score) => score.rubricCriterionId === criterion.id),
    }));
    if (entries.some((entry) => !entry.score)) continue;
    const values = entries.map((entry) => entry.score!.value);
    const spread = Math.max(...values) - Math.min(...values);
    if (spread >= criterionThreshold) {
      advisories.push({
        id: `ADV-${criterion.id}-DIVERGENCE`,
        code: "CRITERION_SCORE_DIVERGENCE",
        severity: spread >= criterionThreshold * 1.5 ? "HIGH_REVIEW" : "REVIEW",
        rubricCriterionId: criterion.id,
        assignmentIds: entries.map((entry) => entry.assignmentId),
        explanation: `${criterion.name} has a ${round(spread)}-point evaluator spread. Moderators must review the evidence and rationales; this is not a finding of misconduct.`,
        advisoryOnly: true,
        accusation: false,
      });
    }

    const rationaleAssignments = new Map<string, string[]>();
    for (const entry of entries) {
      const rationale = normalizedRationale(entry.score!.rationale);
      const assignmentIds = rationaleAssignments.get(rationale) ?? [];
      assignmentIds.push(entry.assignmentId);
      rationaleAssignments.set(rationale, assignmentIds);
    }
    for (const [rationale, assignmentIds] of rationaleAssignments) {
      if (rationale.length >= 20 && assignmentIds.length > 1) {
        advisories.push({
          id: `ADV-${criterion.id}-DUPLICATE-${advisories.length + 1}`,
          code: "DUPLICATE_RATIONALE",
          severity: "REVIEW",
          rubricCriterionId: criterion.id,
          assignmentIds,
          explanation: `${criterion.name} contains identical evaluator rationale text. Review independence; the alert is advisory and makes no accusation.`,
          advisoryOnly: true,
          accusation: false,
        });
      }
    }
  }

  const weightedScores = submissions.map((submission) => submission.weightedScore);
  const overallSpread = Math.max(...weightedScores) - Math.min(...weightedScores);
  if (overallSpread >= overallThreshold) {
    advisories.push({
      id: "ADV-OVERALL-DIVERGENCE",
      code: "OVERALL_SCORE_DIVERGENCE",
      severity: overallSpread >= overallThreshold * 1.5 ? "HIGH_REVIEW" : "REVIEW",
      rubricCriterionId: null,
      assignmentIds: submissions.map((submission) => submission.assignmentId),
      explanation: `Overall weighted scores have a ${round(overallSpread)}-point spread. Human moderation must record how the divergence was resolved.`,
      advisoryOnly: true,
      accusation: false,
    });
  }
  return advisories;
}

export function moderateProposal(input: {
  readonly actor: EvaluationActor;
  readonly proposalId: string;
  readonly decision: ModerationDecisionType;
  readonly rationale: string;
  readonly decidedAt: string;
  readonly rubric: FrozenRubric;
  readonly eligibleAssignmentIds: readonly string[];
  readonly submissions: readonly EvaluationSubmission[];
  readonly advisories: readonly EvaluationIntegrityAdvisory[];
  readonly advisoryReviews: readonly AdvisoryReview[];
}): ModerationDecision {
  validateFrozenRubric(input.rubric);
  requireTimestamp(input.decidedAt);
  if (input.actor.role !== "PROCUREMENT_REVIEWER" && input.actor.role !== "PROBLEM_OWNER") {
    throw new EvaluationRuleError(
      "ACTOR_NOT_AUTHORIZED_TO_MODERATE",
      "Only an authorized procurement reviewer or problem owner can record a selection decision.",
    );
  }
  const rationale = requireText(
    input.rationale,
    30,
    "MODERATION_REASON_REQUIRED",
    "Selection and non-selection decisions require a substantive human-authored reason.",
  );

  const expected = new Set(input.eligibleAssignmentIds);
  const received = new Set(input.submissions.map((submission) => submission.assignmentId));
  if (
    expected.size === 0 ||
    received.size !== input.submissions.length ||
    expected.size !== received.size ||
    [...expected].some((id) => !received.has(id))
  ) {
    throw new EvaluationRuleError(
      "INDEPENDENT_SCORING_INCOMPLETE",
      "All non-recused independent evaluator assignments must submit before moderation.",
    );
  }
  if (
    input.submissions.some(
      (submission) =>
        submission.proposalId !== input.proposalId ||
        submission.rubricVersionId !== input.rubric.versionId ||
        submission.rubricContentHash !== input.rubric.contentHash,
    )
  ) {
    throw new EvaluationRuleError("RUBRIC_HASH_MISMATCH", "Every moderated submission must use the same proposal and frozen rubric hash.");
  }

  const verifiedScores = input.submissions.map((submission) =>
    recomputeSubmissionScore(input.rubric, submission),
  );

  const reviews = new Map(input.advisoryReviews.map((review) => [review.advisoryId, review]));
  for (const advisory of input.advisories) {
    const review = reviews.get(advisory.id);
    if (!review || review.reason.trim().length < 12) {
      throw new EvaluationRuleError(
        "ADVISORY_REVIEW_REQUIRED",
        `Resolve advisory ${advisory.id} with a reason before recording the decision.`,
      );
    }
  }

  const finalScore = round(
    verifiedScores.reduce((total, score) => total + score, 0) / verifiedScores.length,
  );

  return {
    proposalId: input.proposalId,
    decision: input.decision,
    finalScore,
    rationale,
    decidedBy: input.actor.id,
    decidedByRole: input.actor.role,
    decidedAt: input.decidedAt,
    reviewedAdvisories: input.advisoryReviews.map((review) => ({ ...review, reason: review.reason.trim() })),
    humanAuthorized: true,
    autonomousSelection: false,
  };
}
