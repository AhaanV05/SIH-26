import type { AuditEventInput } from "@/modules/audit/audit-chain";
import type {
  EvaluationActor,
  EvaluationAssignment,
  EvaluationSubmission,
  ModerationDecision,
} from "./types";

export function buildEvaluationConflictDeclaredAuditEvent(
  assignment: EvaluationAssignment,
  actor: EvaluationActor,
  correlationId?: string,
): AuditEventInput {
  const declaration = assignment.conflictDeclaration;
  const isRecused = declaration?.hasConflict ?? false;

  return {
    id: `AUDIT-CONF-${assignment.id}-${Date.now()}`,
    occurredAt: declaration?.declaredAt ?? new Date().toISOString(),
    actor: {
      id: actor.id,
      type: "USER",
      role: actor.role,
    },
    action: isRecused ? "EVALUATOR_RECUSED_CONFLICT" : "EVALUATOR_CLEARED_NO_CONFLICT",
    entityType: "EVALUATION_ASSIGNMENT",
    entityId: assignment.id,
    correlationId: correlationId ?? `CORR-EVAL-${assignment.proposalId}`,
    reason: declaration?.details ?? (isRecused ? "Conflict declared" : "No conflict declared"),
    metadata: {
      proposalId: assignment.proposalId,
      evaluatorId: assignment.evaluatorId,
      hasConflict: isRecused,
      status: assignment.status,
      rubricVersionId: assignment.rubricVersionId,
      rubricContentHash: assignment.rubricContentHash,
    },
  };
}

export function buildEvaluationSubmittedAuditEvent(
  submission: EvaluationSubmission,
  actor: EvaluationActor,
  correlationId?: string,
): AuditEventInput {
  return {
    id: `AUDIT-SUBM-${submission.id}-${Date.now()}`,
    occurredAt: submission.submittedAt,
    actor: {
      id: actor.id,
      type: "USER",
      role: actor.role,
    },
    action: "INDEPENDENT_EVALUATION_SUBMITTED",
    entityType: "EVALUATION_SUBMISSION",
    entityId: submission.id,
    correlationId: correlationId ?? `CORR-EVAL-${submission.proposalId}`,
    reason: `Independent scoring completed with weighted score ${submission.weightedScore}.`,
    metadata: {
      proposalId: submission.proposalId,
      assignmentId: submission.assignmentId,
      evaluatorId: submission.evaluatorId,
      rubricVersionId: submission.rubricVersionId,
      rubricContentHash: submission.rubricContentHash,
      weightedScore: submission.weightedScore,
      criteriaScoredCount: submission.scores.length,
      independent: true,
    },
  };
}

export function buildModerationDecidedAuditEvent(
  decision: ModerationDecision,
  actor: EvaluationActor,
  correlationId?: string,
): AuditEventInput {
  return {
    id: `AUDIT-MOD-${decision.proposalId}-${Date.now()}`,
    occurredAt: decision.decidedAt,
    actor: {
      id: actor.id,
      type: "USER",
      role: actor.role,
    },
    action: `PROPOSAL_MODERATION_${decision.decision}`,
    entityType: "PROPOSAL",
    entityId: decision.proposalId,
    correlationId: correlationId ?? `CORR-EVAL-${decision.proposalId}`,
    reason: decision.rationale,
    metadata: {
      proposalId: decision.proposalId,
      decision: decision.decision,
      finalScore: decision.finalScore,
      decidedByRole: decision.decidedByRole,
      reviewedAdvisoriesCount: decision.reviewedAdvisories.length,
      humanAuthorized: true,
      autonomousSelection: false,
    },
  };
}
