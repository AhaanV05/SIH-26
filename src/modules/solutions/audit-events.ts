import type { AuditEventInput } from "@/modules/audit/audit-chain";
import type { AdoptionRequestSnapshot } from "./adoption-workflow";
import type { TransferabilityAssessment } from "./transferability";

export function buildTransferabilityEvaluatedAuditEvent(
  assessment: TransferabilityAssessment,
  actorId: string,
  correlationId?: string,
  occurredAt?: string,
): AuditEventInput {
  return {
    id: `AUDIT-SCALE-ASSESS-${assessment.id}-${Date.now()}`,
    occurredAt: occurredAt ?? new Date().toISOString(),
    actor: {
      id: actorId,
      type: "USER",
      role: "TRANSFERABILITY_ANALYST",
    },
    action: "TRANSFERABILITY_ASSESSMENT_EVALUATED",
    entityType: "TRANSFERABILITY_ASSESSMENT",
    entityId: assessment.id,
    correlationId: correlationId ?? `CORR-SCALE-${assessment.solutionCardId}`,
    reason:
      assessment.reasons.join("; ") ||
      `Transferability score ${assessment.score} computed with recommendation ${assessment.recommendation}.`,
    metadata: {
      solutionCardId: assessment.solutionCardId,
      sourceContextId: assessment.sourceContextId,
      targetContextId: assessment.targetContextId,
      score: assessment.score,
      recommendation: assessment.recommendation,
      scoreBandRecommendation: assessment.scoreBandRecommendation,
      bindingConstraints: assessment.bindingConstraints,
      factorsCount: assessment.factors.length,
      advisoryOnly: true,
      humanAuthorizationRequired: true,
    },
  };
}

export function buildAdoptionTransitionAuditEvent(
  snapshot: AdoptionRequestSnapshot,
  latestHistory: AdoptionRequestSnapshot["history"][number],
  actorId: string,
  correlationId?: string,
  occurredAt?: string,
): AuditEventInput {
  return {
    id: `AUDIT-ADOPT-${snapshot.requestId}-V${snapshot.version}-${Date.now()}`,
    occurredAt: occurredAt ?? new Date().toISOString(),
    actor: {
      id: actorId,
      type: "USER",
      role: latestHistory.actorRole,
    },
    action: `ADOPTION_STATE_${latestHistory.to}`,
    entityType: "ADOPTION_REQUEST",
    entityId: snapshot.requestId,
    correlationId: correlationId ?? `CORR-ADOPT-${snapshot.requestId}`,
    reason: latestHistory.reason,
    metadata: {
      requestId: snapshot.requestId,
      solutionCardId: snapshot.solutionCardId,
      targetDepartmentId: snapshot.targetDepartmentId,
      fromState: latestHistory.from,
      toState: latestHistory.to,
      version: snapshot.version,
      recommendation: snapshot.recommendation,
      assessmentId: snapshot.assessmentId,
      pathwayAuthorizedByHuman: snapshot.pathwayAuthorizedByHuman,
      autonomousAdoption: false,
    },
  };
}
