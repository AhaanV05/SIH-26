import { NextResponse } from "next/server";
import { appendAuditEvent, type AuditEvent } from "@/modules/audit/audit-chain";
import {
  buildAdoptionTransitionAuditEvent,
  assessTransferability,
  createAdoptionRequest,
  transitionAdoptionRequest,
  type AdoptionActorRole,
  type AdoptionRequestSnapshot,
  type AdoptionRequestState,
  type TransferabilityAssessment,
} from "@/modules/solutions";
import { authorizeRouteRequest } from "@/platform/route-authorization";
import type { MembershipRole } from "@prisma/client";

const adoptionStore = new Map<string, AdoptionRequestSnapshot>();
const auditEventLog: AuditEvent[] = [];

type AdoptionRoutePolicy = {
  allowedRoles: readonly MembershipRole[];
  actorRole: AdoptionActorRole;
};

function policyForAdoptionDestination(
  destination: AdoptionRequestState,
): AdoptionRoutePolicy | null {
  if (destination === "ASSESSMENT_READY") {
    return {
      allowedRoles: ["PROBLEM_OWNER"],
      actorRole: "TRANSFERABILITY_RULE_ENGINE",
    };
  }
  if (destination === "SUBMITTED_FOR_AUTHORIZATION") {
    return {
      allowedRoles: ["PROBLEM_OWNER"],
      actorRole: "PROBLEM_OWNER",
    };
  }
  if (destination === "AUTHORIZED" || destination === "RETURNED") {
    return {
      allowedRoles: ["PROCUREMENT_REVIEWER"],
      actorRole: "PROCUREMENT_REVIEWER",
    };
  }
  return null;
}

function getOrCreateAdoptionRequest(
  requestId: string,
  solutionCardId = "SOLUTION-WASTE-001",
  targetDepartmentId = "DEPT-SATARA-SERVICES",
): AdoptionRequestSnapshot {
  let snapshot = adoptionStore.get(requestId);
  if (!snapshot) {
    snapshot = createAdoptionRequest({
      requestId,
      solutionCardId,
      targetDepartmentId,
    });
    adoptionStore.set(requestId, snapshot);
  }
  return snapshot;
}

function recordAuditEvent(
  eventInput: ReturnType<typeof buildAdoptionTransitionAuditEvent>,
): AuditEvent {
  const previous = auditEventLog[auditEventLog.length - 1];
  const event = appendAuditEvent(previous, eventInput);
  auditEventLog.push(event);
  return event;
}

export async function GET(request: Request) {
  try {
    const authorization = await authorizeRouteRequest(request, [
      "PROBLEM_OWNER",
      "PROCUREMENT_REVIEWER",
    ]);
    if (!authorization.authorized) return authorization.response;

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId") ?? "ADOPTION-SATARA-001";

    const snapshot = getOrCreateAdoptionRequest(requestId);

    return NextResponse.json({
      success: true,
      snapshot,
      auditEventsCount: auditEventLog.length,
      latestAuditHash: auditEventLog[auditEventLog.length - 1]?.eventHash ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve adoption request",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = body.requestId as string;
    const to = body.to as AdoptionRequestState;
    const reason = body.reason as string;
    const expectedVersion = Number(body.expectedVersion ?? 0);
    const assessment = body.assessment as TransferabilityAssessment | undefined;
    const solutionCardId = (body.solutionCardId as string) ?? "SOLUTION-WASTE-001";
    const targetDepartmentId = (body.targetDepartmentId as string) ?? "DEPT-SATARA-SERVICES";

    if (!requestId || !to || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: requestId, to, reason.",
        },
        { status: 400 },
      );
    }

    const policy = policyForAdoptionDestination(to);
    if (!policy) {
      return NextResponse.json(
        { success: false, error: `Unsupported adoption destination '${to}'.` },
        { status: 400 },
      );
    }

    const authorization = await authorizeRouteRequest(request, policy.allowedRoles);
    if (!authorization.authorized) return authorization.response;

    const currentSnapshot = getOrCreateAdoptionRequest(
      requestId,
      solutionCardId,
      targetDepartmentId,
    );

    const verifiedAssessment = to === "ASSESSMENT_READY" && assessment
      ? assessTransferability({
          assessmentId: assessment.id,
          solutionCardId: assessment.solutionCardId,
          sourceContextId: assessment.sourceContextId,
          targetContextId: assessment.targetContextId,
          synthetic: assessment.synthetic,
          displayLabel: assessment.displayLabel,
          factors: assessment.factors.map((factor) => ({
            key: factor.key,
            score: factor.score,
            rationale: factor.rationale,
            evidenceIds: factor.evidenceIds,
            gaps: factor.gaps,
            constraint: factor.constraint,
          })),
        })
      : undefined;

    const nextSnapshot = transitionAdoptionRequest(currentSnapshot, {
      expectedVersion,
      to,
      actorRole: policy.actorRole,
      reason,
      assessment: verifiedAssessment,
    });

    adoptionStore.set(requestId, nextSnapshot);

    const latestHistory = nextSnapshot.history[nextSnapshot.history.length - 1];
    if (!latestHistory) {
      throw new Error("Adoption history record missing after transition");
    }

    const auditEvent = recordAuditEvent(
      buildAdoptionTransitionAuditEvent(
        nextSnapshot,
        latestHistory,
        authorization.actor.id,
        authorization.actor.membershipRole,
      ),
    );

    return NextResponse.json({
      success: true,
      snapshot: nextSnapshot,
      auditEvent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Adoption request transition error",
      },
      { status: 400 },
    );
  }
}
