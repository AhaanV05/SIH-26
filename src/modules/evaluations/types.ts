export const evaluationActorRoles = [
  "EVALUATOR",
  "PROCUREMENT_REVIEWER",
  "PROBLEM_OWNER",
] as const;

export type EvaluationActorRole = (typeof evaluationActorRoles)[number];

export interface EvaluationActor {
  readonly id: string;
  readonly role: EvaluationActorRole;
}

export interface FrozenRubricCriterion {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly weight: number;
  readonly scoreMin: number;
  readonly scoreMax: number;
}

export interface FrozenRubric {
  readonly versionId: string;
  readonly version: number;
  readonly contentHash: string;
  readonly frozenAt: string;
  readonly criteria: readonly FrozenRubricCriterion[];
}

export type EvaluationAssignmentStatus =
  | "ASSIGNED"
  | "READY_TO_SCORE"
  | "RECUSED"
  | "SUBMITTED";

export interface ConflictDeclaration {
  readonly hasConflict: boolean;
  readonly details: string | null;
  readonly declaredAt: string;
  readonly declaredBy: string;
}

export interface EvaluationAssignment {
  readonly id: string;
  readonly proposalId: string;
  readonly evaluatorId: string;
  readonly rubricVersionId: string;
  readonly rubricContentHash: string;
  readonly status: EvaluationAssignmentStatus;
  readonly conflictDeclaration: ConflictDeclaration | null;
}

export interface CriterionScoreInput {
  readonly rubricCriterionId: string;
  readonly value: number;
  readonly rationale: string;
}

export interface SubmittedCriterionScore extends CriterionScoreInput {
  readonly criterionName: string;
  readonly normalizedScore: number;
  readonly weightedContribution: number;
}

export interface EvaluationSubmission {
  readonly id: string;
  readonly assignmentId: string;
  readonly proposalId: string;
  readonly evaluatorId: string;
  readonly rubricVersionId: string;
  readonly rubricContentHash: string;
  readonly scores: readonly SubmittedCriterionScore[];
  readonly weightedScore: number;
  readonly submittedAt: string;
  readonly independent: true;
}

export type IntegrityAdvisoryCode =
  | "CRITERION_SCORE_DIVERGENCE"
  | "OVERALL_SCORE_DIVERGENCE"
  | "DUPLICATE_RATIONALE";

export interface EvaluationIntegrityAdvisory {
  readonly id: string;
  readonly code: IntegrityAdvisoryCode;
  readonly severity: "REVIEW" | "HIGH_REVIEW";
  readonly rubricCriterionId: string | null;
  readonly assignmentIds: readonly string[];
  readonly explanation: string;
  readonly advisoryOnly: true;
  readonly accusation: false;
}

export interface AdvisoryReview {
  readonly advisoryId: string;
  readonly disposition: "EXPLAINED" | "RE_SCORE_REQUESTED" | "ESCALATED";
  readonly reason: string;
}

export type ModerationDecisionType = "SELECTED" | "NOT_SELECTED";

export interface ModerationDecision {
  readonly proposalId: string;
  readonly decision: ModerationDecisionType;
  readonly finalScore: number;
  readonly rationale: string;
  readonly decidedBy: string;
  readonly decidedByRole: "PROCUREMENT_REVIEWER" | "PROBLEM_OWNER";
  readonly decidedAt: string;
  readonly reviewedAdvisories: readonly AdvisoryReview[];
  readonly humanAuthorized: true;
  readonly autonomousSelection: false;
}

export type EvaluationRuleCode =
  | "ACTOR_NOT_EVALUATOR"
  | "ACTOR_NOT_ASSIGNED"
  | "ACTOR_NOT_AUTHORIZED_TO_MODERATE"
  | "ASSIGNMENT_NOT_OPEN"
  | "CONFLICT_DECLARATION_REQUIRED"
  | "CONFLICT_REQUIRES_RECUSAL"
  | "CONFLICT_DETAILS_REQUIRED"
  | "RUBRIC_NOT_FROZEN"
  | "RUBRIC_HASH_MISMATCH"
  | "RUBRIC_INVALID"
  | "SCORE_SET_INCOMPLETE"
  | "SCORE_OUT_OF_RANGE"
  | "RATIONALE_REQUIRED"
  | "EVALUATION_ALREADY_SUBMITTED"
  | "SUBMISSION_INTEGRITY_INVALID"
  | "INDEPENDENT_SCORING_INCOMPLETE"
  | "ADVISORY_REVIEW_REQUIRED"
  | "MODERATION_REASON_REQUIRED"
  | "INVALID_TIMESTAMP";

export class EvaluationRuleError extends Error {
  readonly code: EvaluationRuleCode;

  constructor(code: EvaluationRuleCode, message: string) {
    super(message);
    this.name = "EvaluationRuleError";
    this.code = code;
  }
}
