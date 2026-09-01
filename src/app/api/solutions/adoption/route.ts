import { NextResponse } from "next/server";
import { appendAuditEvent, type AuditEvent } from "@/modules/audit/audit-chain";
import {
  buildAdoptionTransitionAuditEvent,
  createAdoptionRequest,
  transitionAdoptionRequest,
  type AdoptionActorRole,
  type AdoptionRequestSnapshot,
  type AdoptionRequestState,
  type TransferabilityAssessment,
} from "@/modules/solutions";

const adoptionStore = new Map<string, AdoptionRequestSnapshot>();
const auditEventLog: AuditEvent[] = [];

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
    const actorRole = body.actorRole as AdoptionActorRole;
    const actorId = (body.actorId as string) ?? "USR-PROC-REV-1";
    const reason = body.reason as string;
    const expectedVersion = Number(body.expectedVersion ?? 0);
    const assessment = body.assessment as TransferabilityAssessment | undefined;
    const solutionCardId = (body.solutionCardId as string) ?? "SOLUTION-WASTE-001";
    const targetDepartmentId = (body.targetDepartmentId as string) ?? "DEPT-SATARA-SERVICES";

    if (!requestId || !to || !actorRole || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: requestId, to, actorRole, reason.",
        },
        { status: 400 },
      );
    }

    const currentSnapshot = getOrCreateAdoptionRequest(
      requestId,
      solutionCardId,
      targetDepartmentId,
    );

    const nextSnapshot = transitionAdoptionRequest(currentSnapshot, {
      expectedVersion,
      to,
      actorRole,
      reason,
      assessment,
    });

    adoptionStore.set(requestId, nextSnapshot);

    const latestHistory = nextSnapshot.history[nextSnapshot.history.length - 1];
    if (!latestHistory) {
      throw new Error("Adoption history record missing after transition");
    }

    const auditEvent = recordAuditEvent(
      buildAdoptionTransitionAuditEvent(nextSnapshot, latestHistory, actorId),
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
