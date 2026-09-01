import { NextResponse } from "next/server";
import { appendAuditEvent, type AuditEvent } from "@/modules/audit/audit-chain";
import {
  buildMilestoneTransitionAuditEvent,
  createMilestoneWorkflow,
  transitionMilestoneWorkflow,
  type MilestoneActorRole,
  type MilestoneWorkflowSnapshot,
  type MilestoneWorkflowState,
} from "@/modules/pilots";

// In-memory demo store for milestone snapshots
const milestoneStore = new Map<string, MilestoneWorkflowSnapshot>();
const auditEventLog: AuditEvent[] = [];

function getOrCreateMilestone(milestoneId: string): MilestoneWorkflowSnapshot {
  let snapshot = milestoneStore.get(milestoneId);
  if (!snapshot) {
    snapshot = createMilestoneWorkflow(milestoneId);
    milestoneStore.set(milestoneId, snapshot);
  }
  return snapshot;
}

function recordAuditEvent(
  eventInput: ReturnType<typeof buildMilestoneTransitionAuditEvent>,
): AuditEvent {
  const previous = auditEventLog[auditEventLog.length - 1];
  const event = appendAuditEvent(previous, eventInput);
  auditEventLog.push(event);
  return event;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId") ?? "MS-ECOSCAN-PILOT-01";

    const snapshot = getOrCreateMilestone(milestoneId);

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
        error: error instanceof Error ? error.message : "Failed to load milestone data",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const milestoneId = body.milestoneId as string;
    const to = body.to as MilestoneWorkflowState;
    const actorRole = body.actorRole as MilestoneActorRole;
    const actorId = (body.actorId as string) ?? "USR-PILOT-REV-1";
    const reason = body.reason as string;
    const expectedVersion = Number(body.expectedVersion ?? 0);
    const evidenceObjectIds = body.evidenceObjectIds as string[] | undefined;
    const acceptanceEvaluation = body.acceptanceEvaluation;

    if (!milestoneId || !to || !actorRole || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: milestoneId, to, actorRole, reason.",
        },
        { status: 400 },
      );
    }

    const currentSnapshot = getOrCreateMilestone(milestoneId);

    const nextSnapshot = transitionMilestoneWorkflow(currentSnapshot, {
      expectedVersion,
      to,
      actorRole,
      reason,
      evidenceObjectIds,
      acceptanceEvaluation,
    });

    milestoneStore.set(milestoneId, nextSnapshot);

    const latestEvent = nextSnapshot.events[nextSnapshot.events.length - 1];
    if (!latestEvent) {
      throw new Error("Milestone event missing from transition snapshot");
    }
    const auditEvent = recordAuditEvent(
      buildMilestoneTransitionAuditEvent(nextSnapshot, latestEvent, actorId),
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
        error: error instanceof Error ? error.message : "Milestone transition error",
      },
      { status: 400 },
    );
  }
}
