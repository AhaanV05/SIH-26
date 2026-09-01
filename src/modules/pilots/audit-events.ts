import type { AuditEventInput } from "@/modules/audit/audit-chain";
import type {
  MilestoneWorkflowEvent,
  MilestoneWorkflowSnapshot,
} from "./milestone-workflow";

export function buildMilestoneTransitionAuditEvent(
  snapshot: MilestoneWorkflowSnapshot,
  latestEvent: MilestoneWorkflowEvent,
  actorId: string,
  correlationId?: string,
  occurredAt?: string,
): AuditEventInput {
  return {
    id: `AUDIT-MILESTONE-${snapshot.milestoneId}-V${snapshot.version}-${Date.now()}`,
    occurredAt: occurredAt ?? new Date().toISOString(),
    actor: {
      id: actorId,
      type: "USER",
      role: latestEvent.actorRole,
    },
    action: `MILESTONE_STATE_${latestEvent.to}`,
    entityType: "PILOT_MILESTONE",
    entityId: snapshot.milestoneId,
    correlationId: correlationId ?? `CORR-PILOT-${snapshot.milestoneId}`,
    reason: latestEvent.reason,
    metadata: {
      milestoneId: snapshot.milestoneId,
      fromState: latestEvent.from,
      toState: latestEvent.to,
      version: snapshot.version,
      evidenceObjectIds: snapshot.evidenceObjectIds,
      acceptanceEvaluationId: snapshot.acceptanceEvaluationId,
      evaluationId: latestEvent.evaluationId ?? null,
      humanAuthorizationRequired: true,
    },
  };
}
