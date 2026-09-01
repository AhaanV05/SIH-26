import { NextResponse } from "next/server";
import { appendAuditEvent, type AuditEvent } from "@/modules/audit/audit-chain";
import {
  DEMO_DEFAULT_SCORES,
  DEMO_EVALUATION_LABEL,
  DEMO_EXISTING_SUBMISSIONS,
  DEMO_FROZEN_RUBRIC,
  DEMO_PENDING_ASSIGNMENT,
  EvaluationRuleError,
  analyzeEvaluationIntegrity,
  buildEvaluationConflictDeclaredAuditEvent,
  buildEvaluationSubmittedAuditEvent,
  buildModerationDecidedAuditEvent,
  declareEvaluationConflict,
  moderateProposal,
  submitIndependentEvaluation,
  type AdvisoryReview,
  type CriterionScoreInput,
  type EvaluationActor,
  type EvaluationAssignment,
  type EvaluationSubmission,
  type ModerationDecision,
  type ModerationDecisionType,
} from "@/modules/evaluations";

// In-memory demo store for evaluation state lifecycle
let currentAssignment: EvaluationAssignment = { ...DEMO_PENDING_ASSIGNMENT };
let currentSubmissions: EvaluationSubmission[] = [...DEMO_EXISTING_SUBMISSIONS];
let currentDecision: ModerationDecision | null = null;
const auditEventLog: AuditEvent[] = [];

function getLatestAuditEvent(): AuditEvent | undefined {
  return auditEventLog[auditEventLog.length - 1];
}

function recordAuditEvent(eventInput: ReturnType<typeof buildEvaluationConflictDeclaredAuditEvent>): AuditEvent {
  const previous = getLatestAuditEvent();
  const event = appendAuditEvent(previous, eventInput);
  auditEventLog.push(event);
  return event;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get("proposalId") ?? "PROP-ECOSCAN";

    const advisories = analyzeEvaluationIntegrity(DEMO_FROZEN_RUBRIC, currentSubmissions);

    return NextResponse.json({
      success: true,
      proposalId,
      label: DEMO_EVALUATION_LABEL,
      rubric: DEMO_FROZEN_RUBRIC,
      assignment: currentAssignment,
      submissions: currentSubmissions,
      advisories,
      decision: currentDecision,
      auditEventsCount: auditEventLog.length,
      latestAuditHash: getLatestAuditEvent()?.eventHash ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load evaluation data",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing required 'action' field in request body." },
        { status: 400 },
      );
    }

    if (action === "DECLARE_CONFLICT") {
      const actor: EvaluationActor = body.actor ?? {
        id: currentAssignment.evaluatorId,
        role: "EVALUATOR",
      };
      const hasConflict = Boolean(body.hasConflict);
      const details = body.details ?? null;
      const declaredAt = body.declaredAt ?? new Date().toISOString();

      const nextAssignment = declareEvaluationConflict(currentAssignment, actor, {
        hasConflict,
        details,
        declaredAt,
      });

      currentAssignment = nextAssignment;
      const auditEvent = recordAuditEvent(
        buildEvaluationConflictDeclaredAuditEvent(nextAssignment, actor),
      );

      return NextResponse.json({
        success: true,
        assignment: nextAssignment,
        auditEvent,
      });
    }

    if (action === "SUBMIT_EVALUATION") {
      const actor: EvaluationActor = body.actor ?? {
        id: currentAssignment.evaluatorId,
        role: "EVALUATOR",
      };
      const scores = (body.scores as CriterionScoreInput[]) ?? DEMO_DEFAULT_SCORES;
      const submittedAt = body.submittedAt ?? new Date().toISOString();

      const result = submitIndependentEvaluation({
        assignment: currentAssignment,
        actor,
        rubric: DEMO_FROZEN_RUBRIC,
        scores,
        submittedAt,
      });

      currentAssignment = result.assignment;
      currentSubmissions = [
        ...currentSubmissions.filter((s) => s.evaluatorId !== actor.id),
        result.submission,
      ];

      const auditEvent = recordAuditEvent(
        buildEvaluationSubmittedAuditEvent(result.submission, actor),
      );

      return NextResponse.json({
        success: true,
        assignment: result.assignment,
        submission: result.submission,
        auditEvent,
      });
    }

    if (action === "MODERATE_PROPOSAL") {
      const actor: EvaluationActor = body.actor ?? {
        id: "USR-PROC-REV-1",
        role: "PROCUREMENT_REVIEWER",
      };
      const proposalId = body.proposalId ?? "PROP-ECOSCAN";
      const decisionType = (body.decision as ModerationDecisionType) ?? "SELECTED";
      const rationale = body.rationale as string;
      const decidedAt = body.decidedAt ?? new Date().toISOString();
      const advisoryReviews = (body.advisoryReviews as AdvisoryReview[]) ?? [];

      const advisories = analyzeEvaluationIntegrity(DEMO_FROZEN_RUBRIC, currentSubmissions);
      const eligibleAssignmentIds = [
        "ASSIGN-PROP-ECOSCAN-USR-EVAL-1",
        "ASSIGN-PROP-ECOSCAN-USR-EVAL-2",
        "ASSIGN-PROP-ECOSCAN-USR-EVAL-3",
      ];

      const moderation = moderateProposal({
        actor,
        proposalId,
        decision: decisionType,
        rationale,
        decidedAt,
        rubric: DEMO_FROZEN_RUBRIC,
        eligibleAssignmentIds,
        submissions: currentSubmissions,
        advisories,
        advisoryReviews,
      });

      currentDecision = moderation;
      const auditEvent = recordAuditEvent(
        buildModerationDecidedAuditEvent(moderation, actor),
      );

      return NextResponse.json({
        success: true,
        decision: moderation,
        auditEvent,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported evaluation action '${action}'.` },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof EvaluationRuleError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal evaluation error",
      },
      { status: 500 },
    );
  }
}
