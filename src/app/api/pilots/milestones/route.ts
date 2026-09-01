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
import { authorizeRouteRequest } from "@/platform/route-authorization";
import type { MembershipRole } from "@prisma/client";
import type { MilestoneAcceptanceEvaluation } from "@/modules/evidence";

// In-memory demo store for milestone snapshots
const milestoneStore = new Map<string, MilestoneWorkflowSnapshot>();
const auditEventLog: AuditEvent[] = [];

type MilestoneRoutePolicy = {
  allowedRoles: readonly MembershipRole[];
  actorRole: MilestoneActorRole;
};

function policyForMilestoneDestination(
  destination: MilestoneWorkflowState,
): MilestoneRoutePolicy | null {
  if (destination === "EVIDENCE_SUBMITTED") {
    return {
      allowedRoles: ["STARTUP_ADMIN", "STARTUP_CONTRIBUTOR"],
      actorRole: "STARTUP_CONTRIBUTOR",
    };
  }
  if (destination === "READY_FOR_HUMAN_ACCEPTANCE") {
    return {
      allowedRoles: ["PROBLEM_OWNER"],
      actorRole: "EVIDENCE_RULE_ENGINE",
    };
  }
  if (
    destination === "IN_PROGRESS" ||
    destination === "ACCEPTED" ||
    destination === "RETURNED" ||
    destination === "REJECTED"
  ) {
    return {
      allowedRoles: ["PROBLEM_OWNER"],
      actorRole: "PILOT_REVIEWER",
    };
  }
  return null;
}

function buildSimulatedAcceptanceEvaluation(
  milestoneId: string,
  expectedVersion: number,
): MilestoneAcceptanceEvaluation {
  return {
    id: `SIM-EVAL-${milestoneId}-V${expectedVersion}`,
    milestoneId,
    status: "READY_FOR_HUMAN_ACCEPTANCE",
    rulesSatisfied: true,
    humanAuthorizationRequired: true,
    automaticAcceptancePerformed: false,
    metricEvaluations: [],
    evidenceEvaluations: [],
    blockerCodes: [],
    summary: "SIMULATED_FOR_DEMO server fixture: deterministic readiness checks passed; human acceptance remains required.",
  };
}

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
    const authorization = await authorizeRouteRequest(request, [
      "PROBLEM_OWNER",
      "PROCUREMENT_REVIEWER",
      "FINANCE_OFFICER",
      "STARTUP_ADMIN",
      "STARTUP_CONTRIBUTOR",
    ]);
    if (!authorization.authorized) return authorization.response;

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
    const reason = body.reason as string;
    const expectedVersion = Number(body.expectedVersion ?? 0);
    const evidenceObjectIds = body.evidenceObjectIds as string[] | undefined;

    if (!milestoneId || !to || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: milestoneId, to, reason.",
        },
        { status: 400 },
      );
    }

    const policy = policyForMilestoneDestination(to);
    if (!policy) {
      return NextResponse.json(
        { success: false, error: `Unsupported milestone destination '${to}'.` },
        { status: 400 },
      );
    }

    const authorization = await authorizeRouteRequest(request, policy.allowedRoles);
    if (!authorization.authorized) return authorization.response;

    const currentSnapshot = getOrCreateMilestone(milestoneId);

    const nextSnapshot = transitionMilestoneWorkflow(currentSnapshot, {
      expectedVersion,
      to,
      actorRole: policy.actorRole,
      reason,
      evidenceObjectIds,
      acceptanceEvaluation: to === "READY_FOR_HUMAN_ACCEPTANCE"
        ? buildSimulatedAcceptanceEvaluation(milestoneId, expectedVersion)
        : undefined,
    });

    milestoneStore.set(milestoneId, nextSnapshot);

    const latestEvent = nextSnapshot.events[nextSnapshot.events.length - 1];
    if (!latestEvent) {
      throw new Error("Milestone event missing from transition snapshot");
    }
    const auditEvent = recordAuditEvent(
      buildMilestoneTransitionAuditEvent(
        nextSnapshot,
        latestEvent,
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
        error: error instanceof Error ? error.message : "Milestone transition error",
      },
      { status: 400 },
    );
  }
}
